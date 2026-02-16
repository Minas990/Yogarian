import { RealIpThrottlerGuard } from '@app/common';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UploadThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'upload';
}

@Injectable()
export class DeleteThrottleGuard extends RealIpThrottlerGuard {
  protected throttlerLimit = 'delete';
}
