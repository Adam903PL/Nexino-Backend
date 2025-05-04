import dotenv from "dotenv";

dotenv.config();


export const getEnvironment = (name:string) => {
  const  environment = process.env[name]
  if(!environment){
    throw new Error(`❌ Missing ${name} environment`)
  }
  return environment
}



export const ENV = {
  PORT: getEnvironment("PORT"),
  JWT_SECRET:getEnvironment("JWT_SECRET"),
  COIN_GEKO_API:getEnvironment("COIN_GEKO_API"),
  REDIS_URL:getEnvironment("REDIS_URL"),
  GOOGLE_CASINO_API: getEnvironment("GOOGLE_CASINO_API")
};
