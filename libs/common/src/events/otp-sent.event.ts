
export class OtpSentEvent {
  userId: string;
  email: string;
  otp: string;
  constructor(partial: Partial<OtpSentEvent>) {
    Object.assign(this, partial);
  }
}
