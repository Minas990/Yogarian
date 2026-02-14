import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles, UserProfileDto } from '@app/common';
import { UserLocationDto } from '@app/common/dtos/user-location.dto';
import { OmitType } from '@nestjs/mapped-types';


//omit created at , userId 

export class CreateUserDto extends OmitType(UserProfileDto, ['createdAt', 'userId'] as const) {
  @IsNotEmpty()
  @IsString()
  password: string;
}
