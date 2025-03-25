import { NextFunction, type Request, type Response } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  

  if (!authHeader) {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: "Missing authorization header"
    });
    return;
  }

 
  const parts = authHeader.split(" ");
  
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    res.status(StatusCodes.UNAUTHORIZED).json({
      error: "Invalid header format. Use: 'Bearer <token>'"
    });
    return;
  }

  const token = parts[1];

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret"
    );


    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error during token verification:", err);
    
    if (err instanceof jwt.TokenExpiredError) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        error: "Token expired"
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(StatusCodes.FORBIDDEN).json({
        error: "Invalid token format"
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: "Token verification error"
      });
    }
  }
};