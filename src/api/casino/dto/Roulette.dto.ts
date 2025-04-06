import { Expose, Type } from "class-transformer";
import { IsEnum, IsNumber, IsArray, IsOptional, Min, Max, ArrayMaxSize, ArrayMinSize, ValidateNested } from "class-validator";


enum BetType {

  Red = "Red",
  Black = "Black",
  Green = "Green",
  
  Straight = "Straight", 
  Split = "Split",       
  Street = "Street",     
  Corner = "Corner",     
  Line = "Line",         
}

class BetChoice {
  @Expose()
  @IsEnum(BetType)
  type!: BetType; 

  @Expose()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(36, { each: true })
  @ArrayMinSize(1, { message: "At least 1 number is required for Straight, Split, Street, Corner, or Line" })
  @ArrayMaxSize(1, { groups: ["Straight"] })
  @ArrayMaxSize(2, { groups: ["Split"] })
  @ArrayMaxSize(3, { groups: ["Street"] })
  @ArrayMaxSize(4, { groups: ["Corner"] })
  @ArrayMaxSize(6, { groups: ["Line"] })
  @IsOptional({ groups: ["Red", "Black", "Green"] }) 
  numbers?: number[]; 
}


class RouletteDTO {
  @Expose()
  @Type(() => BetChoice)
  @ValidateNested()
  betChoice!: BetChoice; 
}

export { RouletteDTO, BetChoice, BetType };