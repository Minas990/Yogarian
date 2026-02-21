export class SessionImagesDeletionApprovedEvent {
  constructor(partial: Partial<SessionImagesDeletionApprovedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  photoIds: number[];
}