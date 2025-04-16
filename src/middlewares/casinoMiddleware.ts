import { NextFunction, type Request, type Response } from "express";
import { getUserID, updateUserWallet } from "../services/main.services";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CryptoWallet } from "../api/casino/types";
import { getUserWallet } from "../services/main.services";
import { SlotMachinePOST_DTO } from "../api/casino/dto/SlotMachine.dto";
import { StatusCodes } from "http-status-codes";
import { redis } from "../config/redis";
import express from "express" 
export interface CasinoRequest extends Request {
    validatedData?: {
      userId: string;
      betInt: number;
      cryptoId: string;
    };
  }
  



export interface CasinoRequest extends Request {
    validatedData?: {
      userId: string;
      betInt: number;
      cryptoId: string;
    };
  }
  
  export const casinoMiddleware = async (
    req: CasinoRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {

      const token = req.headers.authorization?.split(" ")[1];
      if (!token) {
        res.status(StatusCodes.UNAUTHORIZED).json({ 
          message: "No authorization token provided" 
        });
        return;
      }

      const { userId } = await getUserID(token);
      if (!userId) {
        res.status(StatusCodes.UNAUTHORIZED).json({
          message: "Invalid token"
        });
        return;
    }
      const bet = req.query.bet as string;
      const cryptoId = req.query.cryptoId as string;
      
      if (!bet || !cryptoId) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: "Missing required parameters: bet and cryptoId"
        });
        return;
      }
  
      const betInt = parseFloat(bet);
      if (isNaN(betInt) || betInt <= 0) {
        res.status(StatusCodes.BAD_REQUEST).json({
          message: "Bet must be a valid positive number"
        });
        return;
      }

      const validated = await plainToInstance(SlotMachinePOST_DTO, {
        userID: userId,
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
  

      const userWallet: CryptoWallet[] = await getUserWallet(userId);
      const selectedCrypto = userWallet.find(
        (crypto) => crypto.cryptoId === validated.cryptoId
      );
  
      if (!selectedCrypto) {
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: "Selected cryptocurrency not found in wallet" 
        });
        return;
      }
  
      if (selectedCrypto.quantity < betInt) {
        res.status(StatusCodes.BAD_REQUEST).json({ 
          message: "Insufficient funds in wallet" 
        });
        return;
      }
  

      req.validatedData = {
        userId,
        betInt,
        cryptoId
      };
  
      next();
    } catch (error) {
      console.error("Middleware error:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: "Internal server error in casino middleware",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };










