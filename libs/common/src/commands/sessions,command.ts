export class SessionCommand 
{
  constructor(partial: Partial<SessionCommand>) 
  {
    Object.assign(this, partial);
  }
  sessionId: string;
  requestId: string;
}

export class CheckSessionsAvailableCommand extends SessionCommand
{
    constructor(partial: Partial<CheckSessionsAvailableCommand>)
    {
        super(partial);
        Object.assign(this, partial);
    }
}

export class CheckSessionsAvailableResponse extends SessionCommand
{
    constructor(partial: Partial<CheckSessionsAvailableResponse>)   
    {     super(partial);
        Object.assign(this, partial);
    }
    available: boolean;
    price: number;
    failure_reason?: any;
}

  export class CheckSessionUpcomingForRefundCommand extends SessionCommand
  {
    constructor(partial: Partial<CheckSessionUpcomingForRefundCommand>)
    {
      super(partial);
      Object.assign(this, partial);
    }
  }

  export class CheckSessionUpcomingForRefundResponse extends SessionCommand
  {
    constructor(partial: Partial<CheckSessionUpcomingForRefundResponse>)
    {
      super(partial);
      Object.assign(this, partial);
    }
    canRefund: boolean;
    failure_reason?: string;
  }