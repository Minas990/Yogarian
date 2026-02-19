import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { Roles, UserProfileDto } from '@app/common';
import { OmitType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';


//omit created at , userId 

export class CreateUserDto extends OmitType(UserProfileDto, ['createdAt', 'userId'] as const) {
  @IsNotEmpty()
  @IsString()
  password: string;

  @Transform(({ value, obj }) => {
    const rawRole = value ?? obj?.Role;
    console.log('Raw role value:', rawRole);
    if (typeof rawRole === 'number') {
      const rolesByIndex = [Roles.ADMIN, Roles.USER, Roles.TRAINER];
      return rolesByIndex[rawRole] ?? rawRole;
    }

    if (typeof rawRole === 'string') {
      const normalizedRole = rawRole.trim().toUpperCase();
      if (normalizedRole in Roles) {
        return Roles[normalizedRole as keyof typeof Roles];
      }
      return normalizedRole;
    }

    return rawRole;
  })
  @IsEnum(Roles)
  role: Roles;
}
