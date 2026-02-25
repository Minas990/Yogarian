import { OmitType, PartialType } from "@nestjs/mapped-types";
import { UserProfileDto } from "../dtos";

export class UserProfileUpdatedEvent  extends PartialType(OmitType(UserProfileDto, [ 'createdAt',"email"] as const))
{
    constructor(partial: Partial<UserProfileUpdatedEvent>) {
        super();
        Object.assign(this, partial);
    }
}