import { UserTokenPayload } from "@app/common/types";
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class EmailConfirmedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean
    {
        const payload:UserTokenPayload = context.switchToHttp().getRequest().user;
        return payload.isEmailConfirmed;
    }
}