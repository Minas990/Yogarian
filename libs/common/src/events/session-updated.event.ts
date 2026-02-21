export class SessionUpdatedEvent {
  constructor(partial: Partial<SessionUpdatedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  latitude: number;
  longitude: number;
  governorate: string;
  address: string;
}
