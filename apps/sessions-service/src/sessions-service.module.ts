import { Module } from '@nestjs/common';
import { SessionsServiceController } from './sessions-service.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { CloudinaryModule, LoggerModule, RateLimiterModule, RequestLoggerInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionsService } from './services/sessions.service';
import { ReviewsService } from './services/reviews.service';
import { SessionsRepository } from './repos/sessions.repo';
import { ReviewsRepository } from './repos/reviews.repo';
import { SessionSubscriber } from './subscribers/session.subscriber';
import { Session } from './models/session.model';
import { Review } from './models/review.model';
import { Photo } from './models/photo.model';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/sessions-service/.env'],
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([Session, Review, Photo]),
    MulterModule.register({
      storage: memoryStorage()
    }),
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
    SessionsService,
    ReviewsService,
    SessionsRepository,
    ReviewsRepository,
    SessionSubscriber,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
    MediumThrottleGuard,
    LongThrottleGuard
  ],
})
export class SessionsServiceModule {}
