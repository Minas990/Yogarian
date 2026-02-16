import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtAuthGuard } from '@app/common';

@Injectable()
export class HttpOnlyJwtAuthGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext) {
    const contextType = context.getType();
    if (contextType !== 'http') 
      return true;
    return super.canActivate(context);
  }
}
