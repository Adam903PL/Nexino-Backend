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

/**
 * @swagger
 * tags:
 *   name: Market
 *   description: Cryptocurrency market operations
 */

const router = express.Router();

/**
 * @swagger
 * /market/price/{coin}:
 *   get:
 *     summary: Get the current price of a cryptocurrency
 *     tags: [Market]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coin
 *         required: true
 *         schema:
 *           type: string
 *         description: Cryptocurrency ID (e.g., bitcoin)
 *     responses:
 *       200:
 *         description: Cryptocurrency price information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 symbol:
 *                   type: string
 *                 name:
 *                   type: string
 *                 current_price:
 *                   type: number
 *                 price_change_24h:
 *                   type: number
 *       400:
 *         description: Bad request
 *       500:
 *         description: Failed to fetch crypto data
 */
router.get("/price/:coin", async (req: Request, res: Response) => {
  try {
    const coinId = req.params.coin;
    if (!coinId) {
      res
        .json({ message: "Missing coin parametr" })
        .status(StatusCodes.BAD_REQUEST);
    }
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/bitcoin",
      {
        headers: {
          Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
          "Content-Type": "application/json",
        },
      }
    );

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

/**
 * @swagger
 * /market/buy/{coin}:
 *   post:
 *     summary: Buy cryptocurrency
 *     tags: [Market]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coin
 *         required: true
 *         schema:
 *           type: string
 *         description: Cryptocurrency ID to buy
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Amount of cryptocurrency to buy
 *     responses:
 *       200:
 *         description: Cryptocurrency purchased successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Error buying crypto
 */
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

/**
 * @swagger
 * /market/sell/{coin}:
 *   post:
 *     summary: Sell cryptocurrency
 *     tags: [Market]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: coin
 *         required: true
 *         schema:
 *           type: string
 *         description: Cryptocurrency ID to sell
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - quantity
 *             properties:
 *               quantity:
 *                 type: number
 *                 description: Amount of cryptocurrency to sell
 *     responses:
 *       200:
 *         description: Cryptocurrency sold successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Error selling crypto
 */
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

/**
 * @swagger
 * /market/trends:
 *   get:
 *     summary: Get cryptocurrency market trends
 *     tags: [Market]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Market trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   symbol:
 *                     type: string
 *                   name:
 *                     type: string
 *                   current_price:
 *                     type: number
 *                   price_change_percentage_24h:
 *                     type: number
 *       500:
 *         description: Failed to fetch market trends
 */
router.get("/trends", async (req: Request, res: Response) => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/coins/markets",
      {
        headers: {
          Authorization: `Bearer ${ENV.COIN_GEKO_API}`,
          "Content-Type": "application/json",
        },
        params: {
          vs_currency: "usd",
          order: "market_cap_desc",
          per_page: 20,
          page: 1,
          sparkline: false,
          price_change_percentage: "24h",
        },
      }
    );

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
          "Content-Type": "application/json",
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
          "Content-Type": "application/json",
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
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "Wishlist name is required" });
      return;
    }

    // Create a new wishlist in database
    const newWishlist = await prisma.wishlist.create({
      data: {
        userId,
        wishlistName,
      },
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
            coinId,
          },
        });
      } catch (error) {
        // If coin validation fails, we still created the wishlist
        // so we'll just return a warning
        res.status(StatusCodes.CREATED).json({
          ...newWishlist,
          warning:
            "Wishlist created but coin could not be added: Invalid coin ID",
        });
        return;
      }
    }

    res.status(StatusCodes.CREATED).json(newWishlist);
  } catch (error) {
    console.error("Error creating wishlist:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error creating wishlist" });
  }
});

router.post(
  "/wishlist/addCoin/:wishlistId",
  async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "No token provided" });
        return;
      }

      await getUserID(token);
      const wishlistId = req.params.wishlistId;
      const { coinId } = req.body;

      if (!coinId) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "coin Id is required" });
        return;
      }

      try {
        await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
      } catch (error) {
        res.status(StatusCodes.BAD_REQUEST).json({ error: "invalid coin Id" });
        return;
      }

      try {
        const wishlistItem = await prisma.wishlistItem.create({
          data: {
            wishlistId,
            coinId,
          },
        });
        res.status(StatusCodes.CREATED).json(wishlistItem);
      } catch (error) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "coin is already in wishlist" });
      }
    } catch (error) {
      console.error("Error adding coin to wishlist:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Error adding coin to wishlist" });
    }
  }
);

router.get("/wishlists", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    const userId = (await getUserID(token)).userId;
    const wishlists = await prisma.wishlist.findMany({
      where: { userId },
      include: {
        items: true,
      },
    });
    res.status(StatusCodes.OK).json(wishlists);
  } catch (error) {
    console.error("Error while fetching wishlist:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error while fetching wishlists" });
  }
});

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
        items: true,
      },
    });

    if (!wishlist) {
      res.status(StatusCodes.NOT_FOUND).json({ error: "Wishlist not found" });
      return;
    }

    if (wishlist.items.length > 0) {
      const coinDetailsPromises = wishlist.items.map((item) =>
        axios
          .get(`https://api.coingecko.com/api/v3/coins/${item.coinId}`)
          .then((response) => {
            const { id, symbol, name, market_data } = response.data;
            return {
              id,
              symbol,
              name,
              current_price: market_data.current_price.usd,
              price_change_24h: market_data.price_change_percentage_24h,
            };
          })
          .catch(() => null)
      );

      const coinDetails = await Promise.all(coinDetailsPromises);
      const itemsWithDetails = wishlist.items.map((item, index) => ({
        ...item,
        coinDetails: coinDetails[index],
      }));

      res.json({
        ...wishlist,
        items: itemsWithDetails,
      });
    } else {
      res.json(wishlist);
    }
  } catch (error) {
    console.error("Error while fetching wishlist:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error while fetching wishlist" });
  }
});

router.delete(
  "/wishlist/deletecoin/:wishlistId/:coinId",
  async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "No token provided" });
        return;
      }

      await getUserID(token);
      const wishlistId = req.params.wishlistId;
      const coinId = req.params.coinId;

      const deletedItem = await prisma.wishlistItem.deleteMany({
        where: {
          wishlistId,
          coinId,
        },
      });

      if (deletedItem.count === 0) {
        res
          .status(StatusCodes.NOT_FOUND)
          .json({ error: "coin not found in wishlist" });
        return;
      }

      res.status(StatusCodes.OK).json({ message: "coin deleted successfuly" });
    } catch (error) {
      console.error("Error removing coin from wishlist:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Error removing coin from wishlist" });
    }
  }
);

router.delete("/wishlist/:wishlistId", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }
    await getUserID(token);
    const wishlistId = req.params.wishlistId;

    await prisma.wishlist.delete({
      where: { id: wishlistId },
    });

    res
      .status(StatusCodes.OK)
      .json({ message: `wishlist ${wishlistId} was deleted` });
  } catch (error) {
    console.error("Error deleting wishlist:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error deleting wishlist" });
  }
});

router.put(
  "/wishlist/updateName/:wishlistId",
  async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "No token provided" });
        return;
      }

      const userInfo = await getUserID(token);
      const userId = userInfo.userId;
      const wishlistId = req.params.wishlistId;
      const { wishlistName } = req.body;

      if (!wishlistName) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Wishlist name is required" });
        return;
      }

      const existingWishlist = await prisma.wishlist.findUnique({
        where: { id: wishlistId },
      });

      if (!existingWishlist) {
        res.status(StatusCodes.NOT_FOUND).json({ error: "Wishlist not found" });
        return;
      }

      if (existingWishlist.userId != userId) {
        res
          .status(StatusCodes.UNAUTHORIZED)
          .json({ error: "You dont have permission to this wishlist" });
        return;
      }

      const updatedWishlist = await prisma.wishlist.update({
        where: { id: wishlistId },
        data: { wishlistName },
        include: { items: true },
      });

      res
        .status(StatusCodes.OK)
        .json({
          message: `wishlist name was changed to ${updatedWishlist.wishlistName}`,
        });
    } catch (error) {
      console.error("Error updating wishlist:", error);
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ error: "Error updating wishlist" });
    }
  }
);

router.patch("/wishlist/batch", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({ error: "No token provided" });
      return;
    }

    const userInfo = await getUserID(token);
    const userId = userInfo.userId;
    const updates = req.body;

    if (!updates || !Array.isArray(updates)) {
      res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: "valid updates array is required" });
      return;
    }

    for (const update of updates) {
      if (!update.wishlistId || !update.wishlistName) {
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({
            error: "Each update must contain wishlistId and wishlistName",
          });
        return;
      }
    }

    const userWishlists = await prisma.wishlist.findMany({
      where: { userId },
    });

    const userWishlistsIds = userWishlists.map((list) => list.id);

    const allWishlistsOwned = updates.every((update) =>
      userWishlistsIds.includes(update.wishlistId)
    );

    if (!allWishlistsOwned) {
      res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "You dont have persmission to update those wishlists" });
      return;
    }

    const updatedWishlists = await prisma.$transaction(
      updates.map((update) =>
        prisma.wishlist.update({
          where: { id: update.wishlistId },
          data: { wishlistName: update.wishlistName },
        })
      )
    );

    res.status(StatusCodes.OK).json(updatedWishlists);
  } catch (error) {
    console.error("Error updating wishlists in batch:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error updating wishlists in batch" });
  }
});

export const marketController = router;
