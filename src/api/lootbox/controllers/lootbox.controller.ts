import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { prisma } from "../../../prisma";
import { getUserID } from "../../../services/main.services";
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

    const caseId = req.query.caseId as string;
    if(!caseId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "CaseId is not found"
      });
      return;
    }

    const caseIdNum = parseInt(caseId);
    if(isNaN(caseIdNum)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid caseId format"
      });
      return;
    }

    const selectedCase = Cases.find(c => c.id === caseIdNum);
    if(!selectedCase) {
      res.status(StatusCodes.NOT_FOUND).json({
        message: "Case not found"
      });
      return;
    }

    // Get user's money
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if(!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found"
      });
      return;
    }

    if(user.money < selectedCase.price) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Not enough money to open this case"
      });
      return;
    }

    const totalDropRate = selectedCase.items.reduce((sum, item) => sum + item.dropRate, 0);
    

    const randomNumber = Math.random() * totalDropRate;
    

    let currentSum = 0;
    let selectedItem = null;
    
    for(const item of selectedCase.items) {
      currentSum += item.dropRate;
      if(randomNumber <= currentSum) {
        selectedItem = item;
        break;
      }
    }

    if(!selectedItem) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to select an item"
      });
      return;
    }


    const gun = Guns.find(g => g.name === selectedItem.name);
    if(!gun) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Selected item not found in guns list"
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { money: user.money - selectedCase.price }
    });


    await prisma.equipment.create({
      data: {
        userId: userId,
        gunId:gun.id,
        gunName:gun.name,
        gunPrice:gun.price
      }
    });

    res.json({
      message: "Case opened successfully",
      item: {
        name: gun.name,
        type: gun.type,
        rarity: gun.rarity,
        price: gun.price
      }
    });

  } catch (error) {
    console.error("Error opening case:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error opening case"
    });
  }
});