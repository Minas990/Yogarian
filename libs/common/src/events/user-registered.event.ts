import {  UserProfileDto } from '../dtos';
import { Roles } from '../types';

export class UserRegisteredEvent extends UserProfileDto
{
  constructor(partial: Partial<UserRegisteredEvent>) {
    super();
    Object.assign(this, partial);
  }
  role: Roles;
}

