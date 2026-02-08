import { Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const logger = new Logger('RequestLogger');

export function expressRequestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { ip, method, path } = req;
  const userId = (req.user as any)?.id || (req.user as any)?.userId || null;
  const userInfo = userId ? `userId ${userId}` : 'anonymous user';
  const logMessage = `${userInfo} with IP address ${ip} hit the endpoint ${method} ${path}`;

  logger.log(logMessage);
  next();
}
