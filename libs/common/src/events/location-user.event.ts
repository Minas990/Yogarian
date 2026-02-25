import { PartialType } from "@nestjs/mapped-types";
import { LocationDto } from "../dtos";

export class LocationUserEvent extends LocationDto
{
    constructor(partial: Partial<LocationUserEvent>)
    {
        super();
        Object.assign(this, partial);
    }
    userId: string;
}

export class UpdateLocationUserEvent extends PartialType(LocationUserEvent) {
    constructor(partial: Partial<UpdateLocationUserEvent>) {
        super(partial);
    }
    userId: string;
}

export class DeleteLocationUserEvent {
    constructor(partial: Partial<DeleteLocationUserEvent>) {
        Object.assign(this, partial);
    }
    userId: string;
}