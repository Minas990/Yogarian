import { UserTokenPayload } from "@app/common/types";
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class EmailConfirmedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean
    {
        const payload:UserTokenPayload = context.switchToHttp().getRequest().user;
        
        if (!payload.isEmailConfirmed) {
            throw new ForbiddenException('Please confirm your email first');
        }
        
        return true;
    }
}