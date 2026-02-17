import { IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLocationDto {
  @IsLatitude()
  @IsNotEmpty()
  latitude: number;

  @IsNotEmpty()
  @IsLongitude()
  longitude: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  governorate?: string;
}
