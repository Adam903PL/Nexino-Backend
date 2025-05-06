import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  addCrypto,
  getUserID,
  getUserWallet,
  updateUserWallet,
} from "../../../services/main.services";
import { plainToInstance } from "class-transformer";
import { WalletDTO } from "../dto/Wallet.dto";
import { validate } from "class-validator";

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: User wallet management
 */

export const walletController = express.Router();

/**
 * @swagger
 * /wallet:
 *   get:
 *     summary: Get user's wallet information
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's wallet retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userWallet:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       cryptoId:
 *                         type: string
 *                       quantity:
 *                         type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
walletController.get("/", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }
    const userId = (await getUserID(token)).userId;
    const userWallet = await getUserWallet(userId);

    res.json({ userWallet }).status(StatusCodes.OK);
  } catch (err) {
    res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    console.error("Error in wallet get:", err);
  }
});



/**
 * @swagger
 * /wallet:
 *   post:
 *     summary: Add cryptocurrency to user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cryptoId
 *               - quantity
 *             properties:
 *               cryptoId:
 *                 type: string
 *                 description: ID of the cryptocurrency to add
 *               quantity:
 *                 type: number
 *                 description: Amount of cryptocurrency to add
 *     responses:
 *       200:
 *         description: Cryptocurrency added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
walletController.post("/", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }
    const userId = (await getUserID(token)).userId;
    const { cryptoId, quantity } = req.body;

    if(!cryptoId || ! quantity){
      res.json({message:"Missing cryptoID or quantity in body"}).status(StatusCodes.BAD_REQUEST)
      return
    }
    
    const validated = plainToInstance(WalletDTO, {
      userId,
      cryptoId,
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

    const updatedWallet = await addCrypto(
      validated.userId,
      validated.cryptoId,
      validated.quantity
    );
    if ('error' in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json({ updatedWallet });
      return;
    }
    res.status(StatusCodes.OK).json({message:`Added ${updatedWallet.cryptoId}-${updatedWallet.quantity}` });
  } catch (err) {
    res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    console.error("Error in wallet get:", err);
  }
});



/**
 * @swagger
 * /wallet:
 *   put:
 *     summary: Update cryptocurrency amount in user's wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cryptoId
 *               - quantity
 *             properties:
 *               cryptoId:
 *                 type: string
 *                 description: ID of the cryptocurrency to update
 *               quantity:
 *                 type: number
 *                 description: New amount of cryptocurrency
 *     responses:
 *       200:
 *         description: Wallet updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedWallet:
 *                   type: object
 *       400:
 *         description: Bad request or validation error
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
walletController.put("/", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }
    const userId = (await getUserID(token)).userId;
    const { cryptoId, quantity } = req.body;
    if(!cryptoId || ! quantity){
      res.json({message:"Missing cryptoID or quantity in body"}).status(StatusCodes.BAD_REQUEST)
      return
    }
    const validated = plainToInstance(WalletDTO, {
      userId,
      cryptoId,
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

    const updatedWallet = await updateUserWallet(
      validated.userId,
      validated.cryptoId,
      validated.quantity
    );
    if ('error' in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json({ updatedWallet });
      return;
    }
    res.status(StatusCodes.OK).json({ updatedWallet });
  } catch (err) {
    res.sendStatus(StatusCodes.INTERNAL_SERVER_ERROR);
    console.error("Error in wallet get:", err);
  }
});
