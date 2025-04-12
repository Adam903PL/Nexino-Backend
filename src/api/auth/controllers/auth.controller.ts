import express, { Request, Response } from "express";

import { prisma } from "../../../prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../../../config/env";
import { StatusCodes } from "http-status-codes";
import { redis } from "../../../config/redis";
export const authController = express.Router();
interface User {
  id: string;
  email: string;
  password: string;
  name?: string | null;
  createdAt: Date;
}
const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

authController.post("/generate-token", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = (await prisma.user.findUnique({
      where: { email },
    })) as User;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Invalid login information",
      });
      return;
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      ENV.JWT_SECRET || "fallback_secret",
      {
        expiresIn: "24h",
      }
    );

    res.json({
      token,
      expiresIn: "24h",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Błąd logowania:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "An error occurred while logging in.",
    });
  }
});


authController.delete("/", async (req: Request, res: Response) => {
  try {
    const { email, password, userName } = req.body;
    
  
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ message: "Invalid password" });
      return
    }

    const deletedUser = await prisma.user.delete({
      where: { 
        email: email,
        name: userName 
      },
    });

    res.json({ 
      message: "User successfully deleted", 
      deletedUser: { 
        id: deletedUser.id, 
        email: deletedUser.email 
      } 
    });

  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Error deleting user" });
  }
});

authController.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, userName } = req.body;
    const hashedPassword = await hashPassword(password);

    const createdUser = await prisma.user.create({
      data: {
        email,
        name: userName,
        password: hashedPassword
      },
    });

    const getUserId = await prisma.user.findUnique({
      where: { email },
      select: { id: true } 
    })
    const userId = getUserId?.id
    const addUserData = await redis.hset(`user:${userId}`, {
      crapsGame: JSON.stringify({
        status: "not-in-game",
      })
    });


    res.status(StatusCodes.OK).json(createdUser);
  } catch (error) {
    console.error("Błąd rejestracji:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: "An error occurred while register.",
    });
  }
});


