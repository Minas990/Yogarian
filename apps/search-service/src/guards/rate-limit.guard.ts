import { RealIpThrottlerGuard } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MediumThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'medium';
}

@Injectable()
export class LongThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'long';
}
