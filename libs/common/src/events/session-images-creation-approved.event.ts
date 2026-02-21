export class SessionImagesCreationApprovedEvent {
  constructor(partial: Partial<SessionImagesCreationApprovedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  photoIds: number[];
}