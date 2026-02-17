import { Module } from '@nestjs/common';
import { LocationServiceController } from './location-service.controller';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { UserLocation } from './models/location.model';
import { JwtStrategy, LoggerModule, RateLimiterModule, RequestLoggerInterceptor } from '@app/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { LocationRepo } from './repos/location.repo';
import { LocationService } from './location-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/location-service/.env'],
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([UserLocation]),
    LoggerModule.forService('location-service'),
    
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
    })

  ],
  controllers: [LocationServiceController],
  providers: [{
    provide: APP_INTERCEPTOR,
    useClass: RequestLoggerInterceptor,
  },MediumThrottleGuard,LongThrottleGuard,JwtStrategy,LocationRepo,LocationService],
})
export class LocationServiceModule {}
