import { PartialType } from '@nestjs/mapped-types';
import {  CreateUserProfileDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserProfileDto) {}