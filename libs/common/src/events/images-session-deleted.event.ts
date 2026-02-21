export class ImagesSessionDeletedEvent {
  constructor(partial: Partial<ImagesSessionDeletedEvent>) {
    Object.assign(this, partial);
  }

  userId: string;
  sessionId: string;
  photoIds: number[];
}