export class ReservationEvent
{
  constructor(partial: Partial<ReservationEvent>)
  {
    Object.assign(this, partial);
  }
  sessionId: string;
  requestId:string
}

export class ReservationCancelledEvent extends ReservationEvent
{
  constructor(partial: Partial<ReservationCancelledEvent>)
  {
    super(partial);
    Object.assign(this, partial);
  }
}

export class ReservationConfirmedEvent extends ReservationEvent
{
  constructor(partial: Partial<ReservationConfirmedEvent>)
  {
    super(partial);
    Object.assign(this, partial);
  }
  userId: string;
  price: number
  createdAt: Date;
}

export class RefundConfirmedEvent extends ReservationEvent
{
  constructor(partial: Partial<RefundConfirmedEvent>)
  {
    super(partial);
    Object.assign(this, partial);
  }
  userId: string;
  price: number
  createdAt: Date;
}

export class RefundFailedEvent extends ReservationEvent
{
  constructor(partial: Partial<RefundFailedEvent>)
  {
    super(partial);
    Object.assign(this, partial);
  }
  userId: string;
  failure_reason: string;
}