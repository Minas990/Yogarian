import { Type } from 'class-transformer';
import { IsDate, IsEmail, IsString, IsUUID } from 'class-validator';

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
}
