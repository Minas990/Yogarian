export class SessionImagesCreationRejectedEvent {
  constructor(partial: Partial<SessionImagesCreationRejectedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  photoIds: number[];
}