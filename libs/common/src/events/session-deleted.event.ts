export class SessionDeletedEvent {
  constructor(partial: Partial<SessionDeletedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
}
