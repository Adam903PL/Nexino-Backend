import { Expose } from "class-transformer";
import { 
  IsPositive, 
  MinLength, 
  IsUUID
} from "class-validator";



export class WalletDTO {
    @Expose()
    @IsUUID('4', { message: "userid has to be in uuid v4 format" })
    userId!:string

    @Expose()
    @MinLength(1,{message:"CryptoId must have a minimum of 1 letter"})
    cryptoId!:string

    @Expose()
    @IsPositive({message:"The quantity must be greater than 0"})
    quantity!:number

}