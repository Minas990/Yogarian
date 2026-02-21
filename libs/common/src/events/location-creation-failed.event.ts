export class LocationCreationFailedEvent {
  constructor(partial: Partial<LocationCreationFailedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  reason: string;
}
