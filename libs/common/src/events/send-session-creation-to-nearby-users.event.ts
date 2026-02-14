import { SessionCreatedEvent } from "./session.created";

export class SendSessionCreationToNearbyUsersEvent extends SessionCreatedEvent {
    nearbyUsers:string[];
}