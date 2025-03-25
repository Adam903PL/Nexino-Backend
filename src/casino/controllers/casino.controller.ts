import express ,{Request,Response}from "express";

export const casinoController = express.Router()



casinoController.get("/",async(req:Request,res:Response)=>{
    res.json({message:"Sigma"}).status(200)
})