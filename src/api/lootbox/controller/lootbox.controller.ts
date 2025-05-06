import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { prisma } from "../../../prisma";
import { getUserID, UpdateUserMoney } from "../../../services/main.services";
import { Guns, Cases } from "../data/Items";
import random from "random";
import { getAllGuns, SellItem } from "../services/lootbox.services";
import { redis } from "../../../config/redis";

/**
 * @swagger
 * tags:
 *   name: Lootbox
 *   description: Lootbox and equipment management
 */

export const LootBoxController = express.Router();
/**
 * @swagger
 * /lootbox/eq:
 *   get:
 *     summary: Get user's equipment
 *     tags: [Lootbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's equipment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   gunId:
 *                     type: number
 *                   gunName:
 *                     type: string
 *                   gunPrice:
 *                     type: number
 *                   quantity:
 *                     type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
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

    const equipment = await prisma.equipment.findMany({ where: { userId } });

    if (equipment.length === 0) {
      res.json({ message: "You dont have any items in your eq" });
      return;
    }

    const groupedEquipment = equipment.reduce(
      (acc, item) => {
        const existingItem = acc.find((i) => i.gunId === item.gunId);

        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          acc.push({
            gunId: item.gunId,
            gunName: item.gunName,
            gunPrice: item.gunPrice,
            quantity: 1,
          });
        }

        return acc;
      },
      [] as Array<{
        gunId: number;
        gunName: string;
        gunPrice: number;
        quantity: number;
      }>
    );

    res.json(groupedEquipment);
    return;
  } catch (error) {
    console.error("Error getting eq:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error getting eq",
    });
  }
});

/**
 * @swagger
 * /lootbox/open-case:
 *   post:
 *     summary: Open a lootbox case
 *     tags: [Lootbox]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: caseId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the case to open
 *     responses:
 *       200:
 *         description: Case opened successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 item:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     type:
 *                       type: number
 *                     rarity:
 *                       type: number
 *                     price:
 *                       type: number
 *       400:
 *         description: Bad request or not enough money
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Case not found
 *       500:
 *         description: Internal server error
 */
LootBoxController.post("/open-case", async (req: Request, res: Response) => {
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

    const caseId = req.query.caseId as string;
    if (!caseId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "CaseId is not found",
      });
      return;
    }

    const caseIdNum = parseInt(caseId);
    if (isNaN(caseIdNum)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid caseId format",
      });
      return;
    }


    const caseInfo = await redis.hgetall(`case:${caseIdNum}`);
    if (!caseInfo || Object.keys(caseInfo).length === 0) {
      res.status(StatusCodes.NOT_FOUND).json({
        message: "Case not found",
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(StatusCodes.NOT_FOUND).json({
        message: "User not found",
      });
      return;
    }

    const casePrice = parseFloat(caseInfo.price);
    if (user.money < casePrice) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Not enough money to open this case",
      });
      return;
    }


    const itemIndices = await redis.lrange(`case:${caseIdNum}:items`, 0, -1);
    if (!itemIndices || itemIndices.length === 0) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "No items found in this case",
      });
      return;
    }


    const itemsPromises = itemIndices.map(index => 
      redis.hgetall(`case:${caseIdNum}:item:${index}`)
    );
    const itemsData = await Promise.all(itemsPromises);


    const totalDropRate = itemsData.reduce((sum, item) => 
      sum + parseFloat(item.drop_rate), 0
    );

    const randomNumber = Math.random() * totalDropRate;

    let currentSum = 0;
    let selectedItemData = null;
    let selectedGunId = null;

    for (const item of itemsData) {
      currentSum += parseFloat(item.drop_rate);
      if (randomNumber <= currentSum) {
        selectedItemData = item;
        selectedGunId = parseInt(item.gun_id);
        break;
      }
    }

    if (!selectedItemData || !selectedGunId) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Failed to select an item",
      });
      return;
    }

    const gunInfo = await redis.hgetall(`gun:${selectedGunId}`);
    if (!gunInfo || Object.keys(gunInfo).length === 0) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: "Selected gun not found in database",
      });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { money: user.money - casePrice },
    });

    await prisma.equipment.create({
      data: {
        userId: userId,
        gunId: selectedGunId,
        gunName: gunInfo.name,
        gunPrice: parseFloat(gunInfo.price),
      },
    });

    res.json({
      message: "Case opened successfully",
      item: {
        name: gunInfo.name,
        type: parseInt(gunInfo.type),
        rarity: parseFloat(gunInfo.rarity),
        price: parseFloat(gunInfo.price),
      },
    });
  } catch (error) {
    console.error("Error opening case:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error opening case",
    });
  }
});

/**
 * @swagger
 * /lootbox/sell-item:
 *   post:
 *     summary: Sell an item from user's equipment
 *     tags: [Lootbox]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - quantity
 *             properties:
 *               itemId:
 *                 type: number
 *                 description: ID of the item to sell
 *               quantity:
 *                 type: number
 *                 description: Quantity of items to sell
 *     responses:
 *       200:
 *         description: Item sold successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 AccountStatus:
 *                   type: object
 *                 details:
 *                   type: object
 *       400:
 *         description: Bad request or insufficient items
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
LootBoxController.post("/sell-item", async (req: Request, res: Response) => {
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

    const { itemId, quantity } = req.body;
    if (!itemId) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "ItemId is not found",
      });
      return;
    }

    if (!quantity) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Quantity is not found",
      });
      return;
    }

    const result = await SellItem(userId, itemId, quantity);

    if (!result.success) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: result.message,
      });
      return;
    }

    res.json({
      message: "Your item has been sold",
      AccountStatus: result.newBalance,
      details: result,
    });
  } catch (error) {
    console.error("Error selling item:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error selling item",
    });
  }
});

/**
 * @swagger
 * /lootbox/sell-all-item:
 *   post:
 *     summary: Sell all items from user's equipment
 *     tags: [Lootbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All items sold successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 AccountStatus:
 *                   type: object
 *       400:
 *         description: No items in equipment
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
LootBoxController.post("/sell-all-item",
  async (req: Request, res: Response) => {
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

      const items = await prisma.equipment.findMany({
        where: {
          userId: userId,
        },
      });
      if (!items || items.length === 0) {
        res
          .json({ message: "You don't have items in your EQ" })
          .status(StatusCodes.BAD_REQUEST);
      }
      let MoneyToUpdate = 0;

      for (let i of items) {
        MoneyToUpdate += i.gunPrice;
      }
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR)
        console.error("Wyjebało lootbox container if(!user)");
        return;
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          money: user.money + MoneyToUpdate,
        },
      });
      const updatedEQ = await prisma.equipment.deleteMany({where:{userId:userId}})
      res.json({
        message: "Your item has been sold",
        AccountStatus: updatedUser
      });
    } catch (error) {
      console.error("Error selling item:", error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "Error selling item",
      });
    }
  }
);




/**
 * @swagger
 * /lootbox/guns:
 *   get:
 *     summary: Get all available guns
 *     tags: [Lootbox]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all guns
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       500:
 *         description: Internal server error
 */
LootBoxController.get("/guns",async (req:Request,res:Response)=>{
  try{
    const guns = await getAllGuns()
    if(!guns){
      res.json({message:"Error getting guns "}).status(StatusCodes.INTERNAL_SERVER_ERROR)
      
      return
    }

    res.json(guns)
    return
  }catch (error) {
    console.error("Error getting guns:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error getting guns",
    });
  }
})





