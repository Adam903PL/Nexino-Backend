import { 
    IsString, 
    IsNotEmpty,
    Min,
    Max, 
    IsNumber,
    IsOptional
  } from "class-validator";
  
  export class LocalisationDto {
    @IsString()
    @IsNotEmpty({ message: 'Nazwa kasyna jest wymagana' })
    name!: string;
  
    @IsNumber({}, { message: 'Szerokość geograficzna musi być liczbą' })
    @Min(-90, { message: 'Szerokość geograficzna musi być większa lub równa -90' })
    @Max(90, { message: 'Szerokość geograficzna musi być mniejsza lub równa 90' })
    latitude!: number;
  
    @IsNumber({}, { message: 'Długość geograficzna musi być liczbą' })
    @Min(-180, { message: 'Długość geograficzna musi być większa lub równa -180' })
    @Max(180, { message: 'Długość geograficzna musi być mniejsza lub równa 180' })
    longitude!: number;
    
    @IsString()
    @IsOptional()
    address?: string;
    
    @IsString()
    @IsOptional()
    city?: string;
  
    //latitude i longtitude to współrzędne geofraficzne, a zakresy to maksymalne dopuszczalne położenie GPS
    //latitude to szerokość (90 - biegun północny; -90 - południowy) a longtitude szerokość (180 - maks. na wschód; -180 - maks. na zachód)
  }