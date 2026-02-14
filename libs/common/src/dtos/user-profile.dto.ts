import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { UserLocationDto } from './user-location.dto';

export class UserProfileDto {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;
  
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserLocationDto)
  location?: UserLocationDto;
}
