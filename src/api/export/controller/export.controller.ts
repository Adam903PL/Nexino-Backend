import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";

export const ExportController = express.Router();

ExportController.get("/", async (req: Request, res: Response) => {
  try {
    const exportOptions = {
      wallet: {
        endpoint: "/export?type=json",
        description: "Get all your wallet data",
        fileTypes: ["json", "csv"],
        fields: ["gamesPlayed", "wins", "losses", "betHistory"],
      },
    };

    res.status(StatusCodes.OK).json(exportOptions);
  } catch (error) {
    console.error("Error while retrieving available exports:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error retrieving available exports",
    });
  }
});

ExportController.get("/data", async (req: Request, res: Response) => {
  try {
    const exportOptions = { message: "Jakieś dane od pobrania" };

    res.status(StatusCodes.OK).json(exportOptions);
  } catch (error) {
    console.error("Error while retrieving available exports:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error retrieving available exports",
    });
  }
});
