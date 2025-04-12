import express, { Request, Response } from "express";
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { getUserID, updateUserWallet } from "../../../services/main.services";
import { buyCrypto, sellCrypto } from "../services/market.services";
import { plainToInstance } from "class-transformer";
import { WalletDTO } from "../../wallet/dto/Wallet.dto";
import { validate } from "class-validator";
import { prisma } from "../../../prisma";
import { getCryptoPriceInUSD } from "../services/market.services";
import { ENV } from "../../../config/env";

const router = express.Router();

router.get("/price/:coin", async (req: Request, res: Response) => {
  try {
    const coinId = req.params.coin;
    if(!coinId){
        res.json({message:"Missing coin parametr"}).status(StatusCodes.BAD_REQUEST)
    }
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/bitcoin', {
        headers: {
            Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
            'Content-Type': 'application/json',
          },
      });

    const { id, symbol, name, market_data } = response.data;
    res.json({
      id,
      symbol,
      name,
      current_price: market_data.current_price.usd,
      price_change_24h: market_data.price_change_percentage_24h,
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch crypto data" });
  }
});

router.post("/buy/:coin", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }
    const userId = (await getUserID(token)).userId;




    const coinId = req.params.coin;
    const { quantity } = req.body;

    const validated = await plainToInstance(WalletDTO, {
      userId,
      cryptoId: coinId,
      quantity,
    });

    const errors = await validate(validated);
    if (errors.length > 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        errors: errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        })),
      });
      return;
    }

    const cryptoPrice = await getCryptoPriceInUSD(coinId);
    if (!cryptoPrice) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Error during getting crypto price" });
      return;
    }

    const updatedWallet = await buyCrypto(
      userId,
      coinId,
      quantity,
      cryptoPrice
    );

    if ("error" in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json(updatedWallet);
      return;
    }

    res.json(updatedWallet);
  } catch (error) {
    console.error("Error buying crypto:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error buying crypto" });
  }
});

router.post("/sell/:coin", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    const userId = (await getUserID(token)).userId;
    const coinId = req.params.coin;
    const { quantity } = req.body;

    const validated = await plainToInstance(WalletDTO, {
      userId,
      cryptoId: coinId,
      quantity,
    });

    const errors = await validate(validated);
    if (errors.length > 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        errors: errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        })),
      });
      return;
    }

    const cryptoPrice = await getCryptoPriceInUSD(coinId);
    if (!cryptoPrice) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Error during getting crypto price" });
      return;
    }

    const userMoney = await prisma.user.findUnique({
      where: { id: userId },
      select: { money: true },
    });

    if (!userMoney) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
      return;
    }

    const updatedWallet = await sellCrypto(
      userId,
      coinId,
      quantity,
      cryptoPrice
    );
    if ("error" in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json(updatedWallet);
      return;
    }

    res.json(updatedWallet);
  } catch (error) {
    console.error("Error selling crypto:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error selling crypto" });
  }
});

router.get("/trends", async (req: Request, res: Response) => {
  try {
    const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
          headers: {
            Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
            'Content-Type': 'application/json',
          },
          params: {
            vs_currency: "usd",
            order: "market_cap_desc",
            per_page: 20,
            page: 1,
            sparkline: false,
            price_change_percentage: "24h",
          }
        });
        
        console.log(response.data);
        
    res.json(response.data);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch market trends" });
  }
});
router.get("/top-movers", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
        "https://api.coingecko.com/api/v3/coins/markets",
        {
          headers: {
            Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
            'Content-Type': 'application/json',
          },
          params: {
            vs_currency: "usd",
            order: "market_cap_desc",
            per_page: 100,
            page: 1,
            sparkline: false,
            price_change_percentage: "24h",
          },
        }
      );
      
    const coins = response.data;

    const gainers = [...coins]
      .sort(
        (a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h
      )
      .slice(0, 5);
    const losers = [...coins]
      .sort(
        (a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h
      )
      .slice(0, 5);

    res.json({
      gainers,
      losers,
    });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch top movers" });
  }
});

router.get("/history/:coin", async (req: Request, res: Response) => {
  try {
    const coinId = req.params.coin;
    const days = req.query.days || "7";

    const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,
        {
          headers: {
            Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
            'Content-Type': 'application/json',
          },
          params: {
            vs_currency: "usd",
            days: days,
          },
        }
      );
      
    res.json(response.data);
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Failed to fetch coin history" });
  }
});

router.post("/wishlist/create", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    const userId = (await getUserID(token)).userId;
    const { wishlistName, coinId } = req.body;

    if (!wishlistName) {
      res.status(StatusCodes.BAD_REQUEST).json({ error: "Wishlist name is required" });
      return;
    }

    // Create a new wishlist in database
    const newWishlist = await prisma.wishlist.create({
      data: {
        userId,
        wishlistName,
      }
    });

    // If a coinId was provided, add it to the wishlist
    if (coinId) {
      try {
        // Verify the coin exists
        await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);

        // Add to wishlist items
        await prisma.wishlistItem.create({
          data: {
            wishlistId: newWishlist.id,
            coinId
          }
        });
      } catch (error) {
        // If coin validation fails, we still created the wishlist
        // so we'll just return a warning
        res.status(StatusCodes.CREATED).json({
          ...newWishlist,
          warning: "Wishlist created but coin could not be added: Invalid coin ID"
        });
        return
      }
    }

    res.status(StatusCodes.CREATED).json(newWishlist);
  } catch (error) {
    console.error("Error creating wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error creating wishlist" });
  }
});


router.post("/wishlist/addCoin/:wishlistId", async (req:Request,res:Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    await getUserID(token);
    const wishlistId = req.params.wishlistId;
    const {coinId} = req.body;

    if(!coinId){
      res.status(StatusCodes.BAD_REQUEST).json({error: "coin Id is required"})
      return;
    }

    try {
      await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
    }catch (error){
      res.status(StatusCodes.BAD_REQUEST).json({error: "invalid coin Id"});
      return;
    }

    try {
        const wishlistItem = await prisma.wishlistItem.create({
          data: {
            wishlistId,
            coinId,
          }
        })
      res.status(StatusCodes.CREATED).json(wishlistItem)
    }catch (error){
      res.status(StatusCodes.BAD_REQUEST).json({error: "coin is already in wishlist"})
    }

  }catch (error){
    console.error("Error adding coin to wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error adding coin to wishlist" });
  }
})

router.get("/wishlists",async (req:Request,res :Response) => {
  try{
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    const userId = (await getUserID(token)).userId;
    const wishlists = await prisma.wishlist.findMany({
      where: {userId},
      include: {
        items:true
      }
    })
    res.status(StatusCodes.OK).json(wishlists)

  }catch (error){
    console.error("Error while fetching wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error while fetching wishlists" });
  }
})

router.get("/wishlist/:wishlistId", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    await getUserID(token);
    const wishlistId = req.params.wishlistId;
    const wishlist = await prisma.wishlist.findUnique({
      where: { id: wishlistId },
      include: {
        items: true
      }
    });

    if (!wishlist) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Wishlist not found" });
      return;
    }

    if (wishlist.items.length > 0) {
      const coinDetailsPromises = wishlist.items.map(item =>
          axios.get(`https://api.coingecko.com/api/v3/coins/${item.coinId}`)
              .then(response => {
                const { id, symbol, name, market_data } = response.data;
                return {
                  id,
                  symbol,
                  name,
                  current_price: market_data.current_price.usd,
                  price_change_24h: market_data.price_change_percentage_24h
                };
              })
              .catch(() => null)
      );

      const coinDetails = await Promise.all(coinDetailsPromises);
      const itemsWithDetails = wishlist.items.map((item, index) => ({
        ...item,
        coinDetails: coinDetails[index]
      }));

      res.json({
        ...wishlist,
        items: itemsWithDetails
      });
    } else {
      res.json(wishlist);
    }
  } catch (error) {
    console.error("Error while fetching wishlist:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error while fetching wishlist" });
  }
});

export const marketController = router;
