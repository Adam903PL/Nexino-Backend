import { 
  IsString, 
  IsNotEmpty,
  Min,
  Max, 
  IsNumber
} from "class-validator";

export class LocalisationDto {
  @IsString()
  @IsNotEmpty({ message: 'Nazwa kasyna jest wymagana' })
  name!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  //latitude i longtitude to współrzędne geofraficzne, a zakresy to maksymalne dopuszczalne położenie GPS
  //latitude to szerokość (90 - biegun północny; -90 - południowy) a longtitude szerokość (180 - maks. na wschód; -180 - maks. na zachód)

}