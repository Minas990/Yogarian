export class NewSessionNotificationEvent {
  emails: string[];
  sessionId: string;
  trainerName: string;
  trainerId: string;
  message: string;

  constructor(init?: Partial<NewSessionNotificationEvent>) {
    Object.assign(this, init);
  }
}
