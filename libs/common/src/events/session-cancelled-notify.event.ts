export class SessionCancelledNotifyEvent 
{
    eventId: string;
    sessionId: string;
    sessionTitle: string;
    users: string[]; // emails of users to notify
    message: string;
    constructor(partial: Partial<SessionCancelledNotifyEvent>)
    {
      Object.assign(this, partial);
    }
}
