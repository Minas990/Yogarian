import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('RequestLogger');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    
    const { ip, method, path } = request;
    const userId = (request.user as any)?.userId || (request.user as any)?.id;
    const userInfo = userId ? `userId ${userId}` : 'anonymous user';
    const logMessage = `${userInfo} with IP address ${ip} hit the endpoint ${method} ${path}`;

    this.logger.log(logMessage);
    return next.handle();
  }
}
