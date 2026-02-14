import { IsLatitude, IsLongitude, IsNumber, IsOptional, IsString } from "class-validator";
import { LatLongPair } from "./validators";


export class UserLocationDto 
{
    @IsString()
    @IsOptional()
    address: string;
    @IsString()
    @IsOptional()
    governorate: string;
    @IsOptional()
    @IsLatitude()
    @LatLongPair()
    latitude: number;
    @IsOptional()
    @IsLongitude()
    longitude: number;   
}
