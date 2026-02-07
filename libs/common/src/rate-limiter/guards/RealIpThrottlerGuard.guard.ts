import { ThrottlerGuard } from '@nestjs/throttler';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RealIpThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: any) 
  {
    return  req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.ip
  }
}
