import { RealIpThrottlerGuard } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ShortThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'short';
}

@Injectable()
export class SensitiveThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'sensitive';
}
