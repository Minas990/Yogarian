export class LocationUpdateFailedEvent {
  constructor(partial: Partial<LocationUpdateFailedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  reason: string;
}
