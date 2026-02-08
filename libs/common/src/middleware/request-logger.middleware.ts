import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, path } = req;
    const userId = (req.user as any)?.id || (req.user as any)?.userId || null;
    const userInfo = userId ? `userId ${userId}` : 'anonymous user';
    const logMessage = `${userInfo} with IP address ${ip} hit the endpoint ${method} ${path}`;
    this.logger.log(logMessage);

    next();
  }
}
