import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import {ExtractJwt, Strategy} from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy)
{
    constructor(cs : ConfigService)
    {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors(
                [
                    ExtractJwt.fromAuthHeaderAsBearerToken()
                ]
            ),
            ignoreExpiration: false,
            secretOrKey: cs.get<string>('JWT_SECRET') || 'default_jwt_secret'
        });
    }

    async validate(payload:any)
    {
        return {
            userId: payload.sub,
            email: payload.email,
            role: payload.role
        }
    }
}