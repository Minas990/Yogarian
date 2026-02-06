import { Roles } from "@app/common/types/roles.types";

export interface UserTokenPayload
{
    //global uuid
    userId:string,
    email: string,
    role: Roles
}