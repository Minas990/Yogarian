
export class UserEmailUpdatedEvent {
  constructor(partial: Partial<UserEmailUpdatedEvent>) {
    Object.assign(this, partial);
  }
  userId: string;
  email: string;
}
