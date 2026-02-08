import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [CommonService],
  exports: [CommonService, LoggerModule],
})
export class CommonModule {}
