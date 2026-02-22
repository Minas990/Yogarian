import { SessionCreatedEvent } from "./session-created.event";

export class SessionCreatedLocationEvent
{
    sessionCreatedEvent: SessionCreatedEvent;
    nearestUsersIds:string[];
    constructor(sessionCreatedEvent: SessionCreatedEvent, nearestUsersIds:string[])
    {
        this.sessionCreatedEvent = sessionCreatedEvent;
        this.nearestUsersIds = nearestUsersIds;
    }
}