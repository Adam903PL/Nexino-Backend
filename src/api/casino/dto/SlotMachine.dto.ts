import { Expose } from "class-transformer";
import {
  IsNumber,
  IsPositive,
  IsUUID,
  IsString,
  MinLength,
  validateOrReject,
  Min
} from "class-validator";

export class SlotMachinePOST_DTO {
    @Expose()
    @IsUUID('4', { message: "userid has to be in uuid v4 format" })
    @IsString({message:"userid string"})
    userID!: string;

    @Expose()
    // @IsNumber({}, { message: "Bet must be a number" })
    @IsPositive({ message: "bet has to be higher than 0" })
    // @Min(0,{ message: "Bet must be positive number" })
    bet!: number;

    @Expose()
    @IsString({ message: "CryptoId must be a string" })
    @MinLength(1, { message: "CryptoId must have a minimum of 1 letter" })
    cryptoId!: string;


}