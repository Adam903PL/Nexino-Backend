import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
  calculateRoulettePayout,
  RouletteMachine,
  SlotMachine,
} from "../services/casino.services";
import {
  getUserID,
  getUserWallet,
  updateUserWallet,
} from "../../../services/main.services";
import { CryptoWallet } from "../types";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RouletteDTO } from "../dto/Roulette.dto";
import { casinoMiddleware, CasinoRequest } from "../../../middlewares/casinoMiddleware";
import swaggerJsdoc from "swagger-jsdoc";

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Casino API",
      version: "1.0.0",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/api/casino/controller/casino.controller.ts"],
};

const swaggerSpec = swaggerJsdoc(options);

export const casinoController = express.Router();


/**
 * @swagger
 * /casino/slot-machine:
 *   post:
 *     summary: Play the slot machine game
 *     tags: [Casino]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - betInt
 *               - cryptoId
 *             properties:
 *               betInt:
 *                 type: number
 *                 description: The bet amount
 *               cryptoId:
 *                 type: string
 *                 description: The ID of the cryptocurrency to bet with
 *     responses:
 *       200:
 *         description: Successfully played slot machine
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 SlotMachineResult:
 *                   type: object
 *                   properties:
 *                     netProfit:
 *                       type: number
 *                 updatedWallet:
 *                   type: object
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
casinoController.post("/slot-machine", casinoMiddleware, async (req: CasinoRequest, res: Response) => {
  try {
    const { userId, betInt, cryptoId } = req.validatedData!;

    const SlotMachineResult = await SlotMachine(betInt);
    const { netProfit } = SlotMachineResult;

    const updatedWallet = await updateUserWallet(userId, cryptoId, netProfit);
    if ("error" in updatedWallet) {
      res.status(StatusCodes.BAD_REQUEST).json({ updatedWallet });
      return;
    }

    res.status(StatusCodes.OK).json({ 
      SlotMachineResult, 
      updatedWallet 
    });
  } catch (error) {
    console.error("Error slot-machine:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: "Error playing slot-machine" 
    });
  }
});
/**
 * @swagger
 * /casino/roulette:
 *   post:
 *     summary: Play the roulette game
 *     tags: [Casino]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - betChoice
 *               - betInt
 *               - cryptoId
 *             properties:
 *               betChoice:
 *                 type: object
 *                 description: The bet choice for roulette
 *               betInt:
 *                 type: number
 *                 description: The bet amount
 *               cryptoId:
 *                 type: string
 *                 description: The ID of the cryptocurrency to bet with
 *     responses:
 *       200:
 *         description: Successfully played roulette
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rouletteResult:
 *                   type: object
 *                 betChoice:
 *                   type: object
 *                 amountResult:
 *                   type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
casinoController.post("/roulette", casinoMiddleware, async (req: CasinoRequest, res: Response) => {
  try {
    const { betChoice } = req.body;
    if (!betChoice) {
      res.status(StatusCodes.BAD_REQUEST).json({ message: "betChoice is required" });
      return;
    }

    const validatedBetChoice = await plainToInstance(RouletteDTO, { betChoice });
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

    const { userId, betInt, cryptoId } = req.validatedData!;
    
    const rouletteResult = RouletteMachine();
    if (!rouletteResult) {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
        message: "Error during roulette result" 
      });
      return;
    }

    const amountResult = calculateRoulettePayout(validatedBetChoice, betInt, rouletteResult);
    if (!amountResult) {
      res.json({ message: "Error during calculate roulette payout" });
      return;
    }

    const updatedUserWallet = updateUserWallet(userId, cryptoId, amountResult);
    res.json({
      rouletteResult,
      betChoice: validatedBetChoice.betChoice,
      amountResult,
    });
  } catch (error) {
    console.error("Error in roulette:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      error: "Error playing roulette" 
    });
  }
});

/**
 * @swagger
 * /casino/coin-flip:
 *   post:
 *     summary: Play the coin flip game
 *     tags: [Casino]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - betChoice
 *               - betInt
 *               - cryptoId
 *             properties:
 *               betChoice:
 *                 type: string
 *                 enum: [heads, tails]
 *                 description: The bet choice (heads or tails)
 *               betInt:
 *                 type: number
 *                 description: The bet amount
 *               cryptoId:
 *                 type: string
 *                 description: The ID of the cryptocurrency to bet with
 *     responses:
 *       200:
 *         description: Successfully played coin flip
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: string
 *                   enum: [heads, tails]
 *                 payout:
 *                   type: number
 *                 won:
 *                   type: boolean
 *                 newBalance:
 *                   type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
casinoController.post("/coin-flip", casinoMiddleware, async (req: CasinoRequest, res: Response) => {
  try {
    const { betChoice } = req.body;
    if (!betChoice || !["heads", "tails"].includes(betChoice)) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Invalid bet choice. Must be 'heads' or 'tails'"
      });
      return;
    }

    const { userId, betInt, cryptoId } = req.validatedData!;

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const won = result === betChoice;
    const payout = won ? betInt * 2 : 0;

    const userWallet: CryptoWallet[] = await getUserWallet(userId);
    const selectedCrypto = userWallet.find(c => c.cryptoId === cryptoId)!;

    await updateUserWallet(userId, cryptoId, payout - betInt);

    res.status(StatusCodes.OK).json({
      result,
      payout,
      won,
      newBalance: selectedCrypto.quantity + (payout - betInt)
    });
  } catch (error) {
    console.error("Coin flip error:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ 
      message: "Error processing coin flip game" 
    });
  }
});