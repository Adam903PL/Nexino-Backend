import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  getUserID,
  getUserWallet,
  updateUserWallet,
} from "../../../services/main.services";
import { plainToInstance } from "class-transformer";
import { WalletDTO } from "../dto/Wallet.dto";
import { validate } from "class-validator";

export const walletController = express.Router();

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

walletController.put("/", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }
    const userId = (await getUserID(token)).userId;
    const { cryptoId, quantity } = req.body;

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
