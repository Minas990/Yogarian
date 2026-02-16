
export class PasswordResetTokenSentEvent {
  constructor(partial: Partial<PasswordResetTokenSentEvent>) {
    Object.assign(this, partial);
  }
  userId: string;
  email: string;
  resetToken: string;
}
