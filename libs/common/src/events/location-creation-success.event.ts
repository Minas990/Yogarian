export class LocationCreationSuccessEvent {
  constructor(partial: Partial<LocationCreationSuccessEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
}
