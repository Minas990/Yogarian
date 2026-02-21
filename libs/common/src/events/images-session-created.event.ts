export class ImagesSessionCreatedEvent {
  constructor(partial: Partial<ImagesSessionCreatedEvent>) {
    Object.assign(this, partial);
  }

  userId: string;
  sessionId: string;
  photoIds: number[];
}