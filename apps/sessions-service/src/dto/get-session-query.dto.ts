import { Type } from "class-transformer";
import { IsDate, IsNumber, IsOptional, IsString } from "class-validator";

export class GetSessionQueryDto 
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

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    page?: number;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    limit?: number;

    @IsDate()
    @IsOptional()
    @Type(() => Date)
    minStartTime?: Date;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    duration?: number;
}