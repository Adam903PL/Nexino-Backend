import dotenv from "dotenv";

dotenv.config();

export const ENV = {
  PORT: process.env.PORT ?? 3333,
  JWT_SECRET:process.env.JWT_SECRET ?? ""
  
};
