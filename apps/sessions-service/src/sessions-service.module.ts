import { Module } from '@nestjs/common';
import { SessionsServiceController } from './sessions-service.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { CloudinaryModule, LoggerModule, RateLimiterModule, RequestLoggerInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/sessions-service/.env'],
    }),
    KafkaModule.register(),
    DatabaseModule,
    CloudinaryModule,
        RateLimiterModule.registerAsync({
          inject: [ConfigService],
          useFactory: (cs: ConfigService) => ({
            throttlers: [
              {
                name: 'medium',
                ttl: Number(cs.getOrThrow('RATE_LIMIT_MEDIUM_TTL')),
                limit: Number(cs.getOrThrow('RATE_LIMIT_MEDIUM_LIMIT')),
              },
              {
                name: 'long',
                ttl: Number(cs.getOrThrow('RATE_LIMIT_LONG_TTL')),
                limit: Number(cs.getOrThrow('RATE_LIMIT_LONG_LIMIT')),
              },
            ],
          }),
        }),
      LoggerModule.forService('sessions-service'),
  ],
  controllers: [SessionsServiceController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
  ],
})
export class SessionsServiceModule {}
