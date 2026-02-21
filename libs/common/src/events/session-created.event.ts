export class SessionCreatedEvent {
  constructor(partial: Partial<SessionCreatedEvent>) {
    Object.assign(this, partial);
  }

  sessionId: string;
  latitude: number;
  longitude: number;
  governorate: string;
  address: string;
}
