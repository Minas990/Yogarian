
export class UserDeletedEvent {
  constructor(partial: Partial<UserDeletedEvent>) {
    Object.assign(this, partial);
  }
  userId: string;
}
