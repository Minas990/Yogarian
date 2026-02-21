export class LocationUpdateSuccessEvent {
  constructor(partial: Partial<LocationUpdateSuccessEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
}
