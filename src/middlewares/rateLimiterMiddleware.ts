import express, { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { RateLimiterMemory } from "rate-limiter-flexible";

const opts = {
    points: 6,
    duration: 1,
};

const rateLimiter = new RateLimiterMemory(opts);

export const RateLimiter = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const remoteAddress = req.socket.remoteAddress;
        
        if (!remoteAddress) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "Could not determine client IP address.",
            });
            return;
        }
        
        
        await rateLimiter.consume(remoteAddress, 2); 

        next(); 
    } catch (error) {
        const remoteAddress = req.socket.remoteAddress;

        if (!remoteAddress) {
            res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                error: "Could not determine client IP address.",
            });
            return;
        }

        const rateLimiterRes = await rateLimiter.get(remoteAddress);
        if(!rateLimiterRes){
            res.status(StatusCodes.INTERNAL_SERVER_ERROR)
            return
        }
        res.set({
            "Retry-After": rateLimiterRes.msBeforeNext / 1000, 
            "X-RateLimit-Limit": opts.points,
            "X-RateLimit-Remaining": rateLimiterRes.remainingPoints,
            "X-RateLimit-Reset": Math.ceil((Date.now() + rateLimiterRes.msBeforeNext) / 1000),
        });

        res.status(StatusCodes.TOO_MANY_REQUESTS).json({ error: "Too many requests, try again later" });
        return
    }
};
