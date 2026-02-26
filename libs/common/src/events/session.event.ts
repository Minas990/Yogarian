import { PartialType } from "@nestjs/mapped-types";
import { SessionStatus } from "@app/common/types/sessions-status.type";

export class SessionCreatedEvent 
{
    constructor(partial: Partial<SessionCreatedEvent>) {
        Object.assign(this, partial);
    }
    sessionId: string;
    userId: string;//owner
    latitude: number;
    longitude: number;
    address: string;
    governorate: string;
    title: string;
    description: string;
    notes: string;
    maxParticipants: number;
    startTime: Date;
    duration: number
    price: number;
    state: SessionStatus;
    createdAt: Date;
}

export class SessionUpdatedEvent extends PartialType(SessionCreatedEvent) {
    constructor(partial: Partial<SessionUpdatedEvent>) {
        super(partial);
        Object.assign(this,partial)
    }
}

export class SessionDeletedEvent  {
    constructor(partial: Partial<SessionDeletedEvent>) {
        Object.assign(this, partial);
    }
    sessionId: string;
}
