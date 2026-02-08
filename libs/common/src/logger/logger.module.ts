import { Module, DynamicModule } from '@nestjs/common';
import { AppLoggerService, SERVICE_NAME_TOKEN } from './app-logger.service';

@Module({
  providers: [AppLoggerService],
  exports: [AppLoggerService, { provide: SERVICE_NAME_TOKEN, useValue: SERVICE_NAME_TOKEN }],
})
export class LoggerModule {
  static forService(serviceName: string, isGlobal: boolean = true): DynamicModule {
    return {
      module: LoggerModule,
      global: isGlobal,
      providers: [
        AppLoggerService,
        {
          provide: SERVICE_NAME_TOKEN,
          useValue: serviceName,
        },
      ],
      exports: [AppLoggerService],
    };
  }
}
