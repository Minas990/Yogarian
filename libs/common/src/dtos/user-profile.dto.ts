import {  Type } from 'class-transformer';
import { IsDate, IsEmail, IsPhoneNumber, IsString, IsUUID } from 'class-validator';

export class UserProfileDto {
  @IsUUID()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;
  
  @IsPhoneNumber('EG')
  phoneNumber: string;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

}
