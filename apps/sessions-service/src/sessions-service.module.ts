import { Module } from '@nestjs/common';
import { SessionsServiceController } from './sessions-service.controller';
import { SessionsServiceService } from './sessions-service.service';

@Module({
  imports: [],
  controllers: [SessionsServiceController],
  providers: [SessionsServiceService],
})
export class SessionsServiceModule {}
