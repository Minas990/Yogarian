import {  UserProfileDto } from '../dtos';

export class UserRegisteredEvent extends UserProfileDto
{
  constructor(partial: Partial<UserRegisteredEvent>) {
    super();
    Object.assign(this, partial);
  }
}

