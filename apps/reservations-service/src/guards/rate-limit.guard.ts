import { RealIpThrottlerGuard } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BookThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'book';
}

@Injectable()
export class CancelThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'cancel';
}
