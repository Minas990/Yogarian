import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { type Request } from 'express';
import { isUserTokenPayload } from '@app/common/auth/middleware/user-metadata.middleware';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		if (context.getType() !== 'http') {
			return true;
		}

		const request = context.switchToHttp().getRequest<Request>();
		if (!isUserTokenPayload((request as Request & { user?: unknown }).user)) {
			throw new UnauthorizedException('Missing or invalid forwarded user metadata');
		}

		return true;
	}
}