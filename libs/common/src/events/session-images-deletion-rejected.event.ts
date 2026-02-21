export class SessionImagesDeletionRejectedEvent {
  constructor(partial: Partial<SessionImagesDeletionRejectedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  photoIds: number[];
  userId: string;
}