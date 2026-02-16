import {  IsNotEmpty, IsString } from 'class-validator';
import { Roles, UserProfileDto } from '@app/common';
import { OmitType } from '@nestjs/mapped-types';


//omit created at , userId 

export class CreateUserDto extends OmitType(UserProfileDto, ['createdAt', 'userId'] as const) {
  @IsNotEmpty()
  @IsString()
  password: string;
}
