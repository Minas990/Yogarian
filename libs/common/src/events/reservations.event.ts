export class ReservationEvent
{
  constructor(partial: Partial<ReservationEvent>)
  {
    Object.assign(this, partial);
  }
  sessionId: string;
}

export class ReservationCancelledEvent extends ReservationEvent
{
  constructor(partial: Partial<ReservationCancelledEvent>)
  {
    super(partial);
    Object.assign(this, partial);
  }
  requestId:string;
}