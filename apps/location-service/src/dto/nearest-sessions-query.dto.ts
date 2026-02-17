import { IsLatitude, IsLatLong, IsLongitude, IsNotEmpty, IsNumber, IsOptional, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class NearestSessionsQueryDto 
{
    @Type(() => Number)
    @IsLatitude()
    @IsNotEmpty()
    latitude: number;
    @Type(() => Number)
    @IsLongitude()
    @IsNotEmpty()
    longitude: number;

    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    radius?: number;
    
    @Type(() => Number)
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(100)
    limit?: number;
    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(1)
    page?: number;
}