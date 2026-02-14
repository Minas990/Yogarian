import { UserProfileDto } from "@app/common";
import { OmitType, PartialType } from "@nestjs/mapped-types";

export class UpdateUserDto extends PartialType(
  OmitType(UserProfileDto, ['userId', 'email', 'createdAt','location'] as const)
) {}
