import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Roles, type UserTokenPayload } from '@app/common';
import { Request, Response, NextFunction } from 'express';
import { ApiGatewayService } from '../api-gateway.service';

type RequestWithAuth = Request & {
  user?: UserTokenPayload;
  authToken?: string;
};

type PublicEndpoint = {
  method: string;
  pattern: RegExp;
};

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  private readonly publicEndpoints: PublicEndpoint[] = [//we can expose a configurable list of public endpoints here, for now we hardcode them
    { method: 'POST', pattern: /^\/auth\/signup\/?$/ },
    { method: 'POST', pattern: /^\/auth\/login\/?$/ },
    { method: 'POST', pattern: /^\/auth\/forgetPassword\/?$/ },
    { method: 'PATCH', pattern: /^\/auth\/changePassword\/[^/]+\/?$/ },
    { method: 'POST', pattern: /^\/payment\/webhook\/?$/ },
    { method: 'GET', pattern: /^\/search\/sessions\/?$/ },
    { method: 'GET', pattern: /^\/sessions\/[^/]+\/?$/ },
    { method: 'GET', pattern: /^\/user\/[^/]+\/?$/ },
    { method: 'GET', pattern: /^\/media\/user\/[^/]+\/?$/ },
    { method: 'GET', pattern: /^\/media\/sessions\/[^/]+\/?$/ },
  ];

  private readonly knownRootPrefixes = new Set([
    'auth',
    'user',
    'media',
    'location',
    'sessions',
    'search',
    'payment',
    'reservations',//notification service has no http endpoints
  ]);

  constructor(
    private readonly jwtService: JwtService,
    private readonly apiGatewayService: ApiGatewayService,
  ) {}

  async use(req: RequestWithAuth, _res: Response, next: NextFunction): Promise<void> 
  {
    const requestPath = this.resolveRequestPath(req);
    const rootPrefix = requestPath.split('/').filter(Boolean)[0]?.toLowerCase();

    if (!rootPrefix || !this.knownRootPrefixes.has(rootPrefix)) 
    {
      next();
      return;
    }

    console.log(`Incoming request: ${req.method} ${requestPath}`);
    if (this.isPublicEndpoint(req.method, requestPath)) 
    {
      next();
      return;
    }

    const token = this.extractToken(req);
    if (!token) 
      throw new UnauthorizedException('JWT token is required');
    

    await this.apiGatewayService.assertRedisReady();

    if (await this.apiGatewayService.isTokenInvalid(token)) 
      throw new UnauthorizedException('Token is invalidated. Please log in again.');
    

    try 
    {
      const payload = await this.jwtService.verifyAsync<UserTokenPayload>(token);
      req.user = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as Roles,
        isEmailConfirmed: payload.isEmailConfirmed,
        iat: payload.iat,
        exp: payload.exp,
      };
      req.authToken = token;
      next();
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private isPublicEndpoint(method: string, path: string): boolean 
  {
    const normalizedMethod = method.toUpperCase();
    return this.publicEndpoints.some(
      (endpoint) => endpoint.method === normalizedMethod && endpoint.pattern.test(path),
    );
  }

  private extractToken(req: Request): string | null 
  {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) 
      return authHeader.slice(7).trim();
    

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) 
      return null;
    

    const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
    for (const cookie of cookies) 
    {
      if (cookie.startsWith('jwt=')) 
      {
        return decodeURIComponent(cookie.slice(4));
      }
    }

    return null;
  }

  private resolveRequestPath(req: Request): string 
  {
    const rawPath = (req.originalUrl || req.url || req.path || '/').split('?')[0].split('#')[0].trim();
    if (!rawPath) {
      return '/';
    }
    return rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  }
}