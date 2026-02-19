import { Type } from 'class-transformer';
import { IsString, IsNumber, IsOptional, Min, MinLength, MaxLength, IsNotEmpty, ValidateNested, IsDate } from 'class-validator';
import {  ValidStartTime } from './validators/startTime.validator';
import { LocationDto } from '@app/common/dtos/location.dto';

export class CreateSessionDto {
  @IsString()
  @MinLength(3)
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsString()
  @MinLength(10)
  @IsNotEmpty()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  maxParticipants: number;


  @IsDate()
  @Type(() => Date)
  @ValidStartTime()
  startTime: Date;

  @IsNumber()
  @Type(() => Number)
  @Min(30)
  duration: number; //  in minutes

  @IsNumber()
  @Type(() => Number)
  @Min(0)
  price: number;
  
  @IsString()
  @IsOptional()
  notes?: string;

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;
}