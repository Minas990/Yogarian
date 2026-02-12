import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { ROLE_KEY } from "../decorators";
import { Roles, UserTokenPayload } from "@app/common/types";

@Injectable()
export class IsAllowedGuard implements CanActivate
{
    constructor(
        private readonly reflector:Reflector
    ){}
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const roles:Roles[] = this.reflector.getAllAndOverride<Roles[]>(ROLE_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if(!roles) return true;
        const request = context.switchToHttp().getRequest();
        const user:UserTokenPayload = request.user;
        return roles.includes(user.role);
    }
    
} 