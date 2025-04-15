import express, { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Octokit } from "@octokit/rest";

export const GitHubController = express.Router();

GitHubController.get("/repos", async (req: Request, res: Response) => {
  try {
    const rawHeader = req.headers["githubauthtoken"];

    if (!rawHeader || typeof rawHeader !== "string") {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Missing or invalid authorization header",
      });
      return;
    }

    const parts = rawHeader.split(" ");

    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Invalid header format. Use: 'Bearer <token>'",
      });
      return;
    }

    const token = parts[1];

    const octokit = new Octokit({
      auth: token,
    });

    const response = await octokit.repos.listForAuthenticatedUser({
      type: "all", 
    });

    res.json(response.data);
  } catch (err) {
    console.error("Error while getting repos:", err);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "Error retrieving available exports",
    });
  }
});
