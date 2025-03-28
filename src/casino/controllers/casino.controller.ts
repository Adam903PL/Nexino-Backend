import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  calculateRoulettePayout,
  RouletteMachine,
  SlotMachine,
} from "../services/casino.services";
import { Prisma } from "@prisma/client";
import {
  getUserID,
  getUserWallet,
  updateUserWallet,
} from "../../services/main.services";
import { CryptoWallet } from "../types";
import { plainToInstance } from "class-transformer";
import { SlotMachinePOST_DTO } from "../dto/SlotMachine.dto";
import { validate } from "class-validator";
import { RouletteDTO } from "../dto/Roulette.dto";

export const casinoController = express.Router();

casinoController.post("/slot-machine", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }
    const userID = (await getUserID(token)).userId;

    const bet = req.query.bet as string;
    const betInt = parseFloat(bet);
    const cryptoId = req.query.cryptoId as string;
    console.log(typeof betInt, betInt);
    const validated = await plainToInstance(SlotMachinePOST_DTO, {
      userID,
      bet: betInt,
      cryptoId,
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

    const userWallet: CryptoWallet[] = await getUserWallet(
      `${validated.userID}`
    );

    const selectedCrypto: CryptoWallet = userWallet.filter(
      (crypto) => crypto.cryptoId === validated.cryptoId
    )[0];
    if (!selectedCrypto) {
      res
        .json({ message: "You do not have this crypto" })
        .status(StatusCodes.BAD_REQUEST);
      return;
    }
    if (selectedCrypto.quantity < betInt) {
      res
        .json({ message: "You don't have enough funds in your wallet" })
        .status(StatusCodes.BAD_REQUEST);
      return;
    }

    const SlotMachineResult = await SlotMachine(validated.bet);
    const { netProfit } = SlotMachineResult;

    const updatedWallet = await updateUserWallet(
      validated.userID,
      validated.cryptoId,
      netProfit
    );
    if ("error" in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json({ updatedWallet });
      return;
    }
    res.json({ SlotMachineResult, updatedWallet }).status(StatusCodes.OK);
  } catch (error) {
    console.error("Error slot-machine:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error playing slot-machine" });
  }
});

casinoController.post("/roulette", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.json(StatusCodes.UNAUTHORIZED);
      return;
    }

    const { betChoice } = req.body;

    if (!betChoice) {
      res
        .json({ message: "betChoice is required" })
        .status(StatusCodes.BAD_REQUEST);
      return;
    }

    const validatedBetChoice = await plainToInstance(RouletteDTO, {
      betChoice,
    });

    const errorsBetChoice = await validate(validatedBetChoice.betChoice);
    if (errorsBetChoice.length > 0) {
      res.status(StatusCodes.BAD_REQUEST).json({
        errors: errorsBetChoice.map((error) => ({
          property: error.property,
          constraints: error.constraints,
        })),
      });
      return;
    }

    const userID = (await getUserID(token)).userId;
    const bet = req.query.bet as string;
    const betInt = parseFloat(bet);
    const cryptoId = req.query.cryptoId as string;
    console.log(typeof betInt, betInt);
    const validated = await plainToInstance(SlotMachinePOST_DTO, {
      userID,
      bet: betInt,
      cryptoId,
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
    const userWallet: CryptoWallet[] = await getUserWallet(
      `${validated.userID}`
    );

    const selectedCrypto: CryptoWallet = userWallet.filter(
      (crypto) => crypto.cryptoId === validated.cryptoId
    )[0];
    if (!selectedCrypto) {
      res
        .json({ message: "You do not have this crypto" })
        .status(StatusCodes.BAD_REQUEST);
      return;
    }
    if (selectedCrypto.quantity < betInt) {
      res
        .json({ message: "You don't have enough funds in your wallet" })
        .status(StatusCodes.BAD_REQUEST);
      return;
    }
    const rouletteResult = RouletteMachine();
    if (!rouletteResult) {
      res
        .json({ message: "Error during roulette result" })
        .status(StatusCodes.INTERNAL_SERVER_ERROR);
      return;
    }
    const amountResult = calculateRoulettePayout(
      validatedBetChoice,
      validated.bet,
      rouletteResult
    );
    if (!amountResult) {
      res.json({ message: "Error during calculate roulette payout" });
      return;
    }
    const updatedUserWallet = updateUserWallet(userID, cryptoId, amountResult);
    res.json({
      rouletteResult,
      betChoice: validatedBetChoice.betChoice,
      amountResult,
    });
    return;
  } catch (error) {
    console.error("Error slot-machine:", error);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: "Error playing roulette" });
  }
});


