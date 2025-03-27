import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { SlotMachine } from "../utils/slot-machine.util";
import { Prisma } from "@prisma/client";
import { getUserID,getUserWallet, updateUserWallet } from "../../services/main.services";
import { CryptoWallet } from "../types";





export const casinoController = express.Router();

casinoController.post("/slot-machine", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if(!token){
      res.json(StatusCodes.UNAUTHORIZED)
      return;
    }
    const userID = await getUserID(token) 
    
    const bet = req.query.bet as string
    const betInt = parseInt(bet)
    const cryptoId = req.query.cryptoId as string
    const userWallet:CryptoWallet[] = await getUserWallet(`${userID.userId}`) 

    const selectedCrypto:CryptoWallet = userWallet.filter((crypto)=>crypto.cryptoId === cryptoId)[0]
    if(!selectedCrypto){
      res.json({message:"You do not have this crypto"}).status(StatusCodes.BAD_REQUEST)
      return
    }
    if(selectedCrypto.quantity < betInt ){
      res.json({message:"You don't have enough funds in your wallet"}).status(StatusCodes.BAD_REQUEST);
      return;
    }
    
    const SlotMachineResult = await SlotMachine(betInt)
    const {winAmount} = SlotMachineResult


    const updatedWallet = await updateUserWallet(userID.userId,cryptoId,winAmount)
    

    // const betAmount = parseFloat(bet)
    // const budgetAmount = parseFloat(budget)
   
    // const result = SlotMachine(betAmount)

    
    res.json({SlotMachineResult,updatedWallet}).status(StatusCodes.OK)

  } catch (error) {
    console.error("Error slot-machine:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: "Błąd procesowania slotu" });
  }
});