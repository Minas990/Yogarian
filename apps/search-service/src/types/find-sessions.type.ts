import { Type } from "class-transformer";
import { IsBoolean, IsLatitude, IsLongitude, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { IsCursorFormat } from "./validators/validateCursor.validator";

export class FindSessionsDto 
{
    @IsString()
    @IsOptional()
    trainerId?: string;
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    minPrice?: number;
    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    maxPrice?: number;
    @IsString()
    @IsOptional()
    governorate?: string;
    @Type(() => Number)
    @IsLatitude()
    @IsOptional()
    latitude: number;
    @Type(() => Number)
    @IsLongitude()
    @IsOptional()
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
    
    @IsOptional()
    @Type(() => Date)
    minStartTime?: Date;

    @IsOptional()
    @Type(() => Number)
    @Min(1)
    maxParticipants?: number;

    @IsOptional()
    @Type(() => Number)
    @Min(1) 
    minDuration?: number;

    @IsOptional()
    @Type(() => Number)
    @Min(1) 
    maxDuration?: number;
    
    @IsOptional()
    @Type(() => String)
    @IsString()
    @IsCursorFormat({ message: 'Cursor must be in the format: <ISO8601 date>__<UUIDv4>' })
    cursor?: string;

    @IsBoolean()
    @Type(() => Boolean)
    @IsOptional()
    oldSessions?:boolean=false;
}