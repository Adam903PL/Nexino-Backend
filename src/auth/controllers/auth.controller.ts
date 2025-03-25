import express, { Request, Response } from "express";
import { prisma } from "../../prisma";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";   
import { ENV } from "../../config/env";
export const authController = express.Router();
interface User {
  id: string;
  email: string;
  password: string;
  name?: string | null;
  createdAt: Date;
}
authController.post("/generate-token", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email }
    }) as User;

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ 
        error: 'Invalid login information' 
      });
      return;
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email 
      }, 
      ENV.JWT_SECRET || 'fallback_secret', 
      { 
        expiresIn: '1h' 
      }
    );

    
    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error("Błąd logowania:", error);
    res.status(500).json({
      error: 'An error occurred while logging in.'
    });
  }
});
