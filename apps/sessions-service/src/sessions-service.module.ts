import { Module } from '@nestjs/common';
import { SessionsServiceController } from './sessions-service.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { CloudinaryModule, JwtAuthGuard, JwtStrategy, LoggerModule, RateLimiterModule, RequestLoggerInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './repos/sessions.repo';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Session } from './models/session.model';
import { HttpOnlyJwtAuthGuard } from '@app/common/auth/guards/http-only-jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/sessions-service/.env'],
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([Session]),
    MulterModule.register({
      storage: memoryStorage()
    }),
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
    SessionsService,
    SessionsRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    MediumThrottleGuard,
    LongThrottleGuard,
    JwtAuthGuard,
    JwtStrategy,
  ],
})
export class SessionsServiceModule {}
