import express, {Request,Response} from "express";
import axios from 'axios';
import {StatusCodes} from "http-status-codes";
import {getUserID, updateUserWallet} from "../../services/main.services";
import {plainToInstance} from "class-transformer";
import {WalletDTO} from "../../api/wallet/dto/Wallet.dto";
import {validate} from "class-validator";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const router = express.Router();

router.get("/price/:coin", async (req:Request, res:Response) => {
    try {
        const coinId = req.params.coin || 'bitcoin';
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
        const { id, symbol, name, market_data } = response.data;
        res.json({
            id,
            symbol,
            name,
            current_price: market_data.current_price.usd,
            price_change_24h: market_data.price_change_percentage_24h
        });
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch crypto data" });
    }
});

router.post("/buy/:coin", async (req:Request, res:Response) => {
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
            quantity
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

        const updatedWallet = await updateUserWallet(userId, coinId, quantity);
        if ("error" in updatedWallet) {
            res.status(StatusCodes.BAD_REQUEST).json(updatedWallet);
            return;
        }

        res.json(updatedWallet);
    } catch (error) {
        console.error("Error buying crypto:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error buying crypto" });
    }
});


router.post("/sell/:coin", async (req:Request, res:Response) => {
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
            quantity
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

        const updatedWallet = await updateUserWallet(userId, coinId, -quantity);
        if ("error" in updatedWallet) {
            res.status(StatusCodes.BAD_REQUEST).json(updatedWallet);
            return;
        }

        res.json(updatedWallet);
    } catch (error) {
        console.error("Error selling crypto:", error);
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Error selling crypto" });
    }
});

router.get("/trends", async (req: Request, res: Response) => {
    try {
        const response = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 20,
                page: 1,
                sparkline: false,
                price_change_percentage: '24h'
            }
        });
        res.json(response.data);
    } catch (error) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch market trends" });
    }
});

router.get("/top-movers", async (req:Request,res:Response) => {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
            params: {
                vs_currency: 'usd',
                order: 'market_cap_desc',
                per_page: 100,
                page: 1,
                sparkline: false,
                price_change_percentage: '24h'
            }
        })
        const coins = response.data

        const gainers = [...coins].sort((a, b) => b.price_change_percentage_24h - a.price_change_percentage_24h).slice(0, 5);
        const losers = [...coins].sort((a, b) => a.price_change_percentage_24h - b.price_change_percentage_24h).slice(0, 5);

        res.json({
            gainers,
            losers
        });
    }catch (error){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Failed to fetch top movers" });
    }
})

router.get("/history/:coin", async (req:Request,res:Response) => {
    try {
        const coinId = req.params.coin;
        const days = req.query.days || "7";

        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`,{
            params:{
                vs_currency: "usd",
                days: days,
            }
        });
        res.json(response.data);
    }catch (error){
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({error: "Failed to fetch coin history"})
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




router.post("/wishlist/create",async(req:Request,res:Response)=>{
    res.json({message:"Nigger"})
})
export const marketController = router;