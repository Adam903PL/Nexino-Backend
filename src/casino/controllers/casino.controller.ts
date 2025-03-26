import express, { Request, Response } from "express";

import { StatusCodes } from "http-status-codes";







export const casinoController = express.Router();

casinoController.get("/slot-machine", async (req: Request, res: Response) => {
  try {
    res.json({ message: "Sigma" }).status(StatusCodes.OK);
  } catch (error) {
    console.error("Error slot-machine:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
  }
});
