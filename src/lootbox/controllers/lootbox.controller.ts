import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { prisma } from "../../prisma";
import { getUserID } from "../../services/main.services";
import { Guns,Cases } from "../data/Items";
import random from "random"


export const LootBoxController = express.Router();

LootBoxController.get("/eq", async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "No authorization token provided",
      });
      return;
    }

    const { userId } = await getUserID(token);
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid token",
      });
      return;
    }
    const Equipment = await prisma.equipment.findMany({ where: { userId } });
    if(Equipment.length === 0){
        res.json({message:"You dont have any items in your eq"})
        return
    }

    res.json(Equipment)
    return

  } catch (error) {
    console.error("Error getting eq:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error getting eq",
    });
  }
});


LootBoxController.post("/open-case", async(req:Request,res:Response)=>{
  try{
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "No authorization token provided",
      });
      return;
    }

    const { userId } = await getUserID(token);
    if (!userId) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid token",
      });
      return;
    }

    const {caseId} =  req.query;
    if(!caseId){
      res.json({message:"CaseId is not found"}).status(StatusCodes.BAD_REQUEST)
    }

    const Case = Cases.find((caseId)=>{caseId==caseId})








  }catch (error) {
    console.error("Error draw item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error draw item",
    });
  }
})