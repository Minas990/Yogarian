import { Module } from '@nestjs/common';
import { ReservationsServiceController } from './reservations-service.controller';
import { ReservationsServiceService } from './reservations-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { Reservation } from './models/reservation.model';
import { KafkaModule } from '@app/kafka';
import { LoggerModule } from '@app/common/logger/logger.module';
import { RateLimiterModule } from '@app/common/rate-limiter/rate-limiter.module';
import { HttpOnlyJwtAuthGuard } from '@app/common/auth/guards/http-only-jwt-auth.guard';
import { JwtAuthGuard, JwtStrategy, RealIpThrottlerGuard } from '@app/common';
import { BookThrottleGuard, CancelThrottleGuard } from './guards/rate-limit.guard';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from './queue/queues.constants';
import { RefundTimeoutProcessor } from './queue/refund-timeout.processor';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','apps/reservations-service/.env']
    }),
    DatabaseModule,
    DatabaseModule.forFeature([Reservation]),
    KafkaModule.register(),
    LoggerModule.forService('ReservationsService'),
    RateLimiterModule.registerAsync({
          inject: [ConfigService],
          useFactory: (cs: ConfigService) => ({
            throttlers: [
              {
                name: 'book',
                ttl: Number(cs.getOrThrow('RATE_LIMIT_book_TTL')),
                limit: Number(cs.getOrThrow('RATE_LIMIT_book_LIMIT')),
              },
              {
                name: 'cancel',
                ttl: Number(cs.getOrThrow('RATE_LIMIT_cancel_TTL')),
                limit: Number(cs.getOrThrow('RATE_LIMIT_cancel_LIMIT')),
              },
            ],
          }),
        }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: {
          host: cs.getOrThrow<string>('REDIS_HOST'),
          port: cs.getOrThrow<number>('REDIS_PORT'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: QUEUE_CONSTANTS.REFUND_TIMEOUT,
    }),

  ],
  controllers: [ReservationsServiceController],
  providers: [ReservationsServiceService,JwtStrategy,JwtAuthGuard,HttpOnlyJwtAuthGuard,BookThrottleGuard,CancelThrottleGuard,RealIpThrottlerGuard,RefundTimeoutProcessor],
})
export class ReservationsServiceModule {}
