import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from "class-validator";
import { LatLongPair } from "./validators";


export class LocationDto 
{
    @IsString()
    @IsOptional()
    address: string;
    @IsString()
    @IsOptional()
    governorate: string;
    @IsOptional()
    @IsLatitude()
    @IsNumber()
    @Type(() => Number)
    @LatLongPair()
    latitude: number;
    @IsOptional()
    @IsLongitude()
    @IsNumber()
    @Type(() => Number)
    longitude: number;   
}
