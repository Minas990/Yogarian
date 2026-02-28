export class SessionNotifyEvent 
{
    eventId: string;
    sessionId: string;
    trainerId: string;
    trainerName: string;
    trainerPhotoUrl: string;
    address: string; 
    longitude: number;
    latitude: number;
    users: string[]; //emails of users to notify
    message: string;//a trainer u follow or someone near you created a new session
    startTime: Date;
    price: number;
    title: string;
    constructor( partial : Partial<SessionNotifyEvent>)
    {
      Object.assign(this, partial);
    }
}