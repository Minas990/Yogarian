import { Module } from '@nestjs/common';
import { SessionsServiceController } from './sessions-service.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { CloudinaryModule, JwtAuthGuard, JwtStrategy, LoggerModule, RateLimiterModule, RequestLoggerInterceptor } from '@app/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { SessionsService } from './services/sessions.service';
import { SessionsRepository } from './repos/sessions.repo';
import { RunningSessionsProcessor } from './queue/ongoing.processor';
import { CompletedSessionsProcessor } from './queue/completed.processor';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Session } from './models/session.model';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { LOCATION_PACKAGE_NAME, LOCATION_SERVICE_NAME } from '@app/common/generated/location';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from './queue/queues.constants';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/sessions-service/.env'],
    }),
    KafkaModule.register(),
    ClientsModule.registerAsync([{
      name: LOCATION_SERVICE_NAME,
      inject: [ConfigService],
      useFactory: (cs:ConfigService) => ({
        transport:Transport.GRPC,
        options: {
          package: LOCATION_PACKAGE_NAME,
          url : cs.getOrThrow<string>('LOCATION_SERVICE_URL') + ":" + cs.getOrThrow<string>('LOCATION_GRPC_PORT'),
          protoPath:'libs/common/src/proto/location.proto',
        }
      })
    }]),
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
        name:QUEUE_CONSTANTS.RUNNING_SESSIONS,
      }),
      BullModule.registerQueue({
        name:QUEUE_CONSTANTS.COMPLETED_SESSIONS,
      })
  ],
  controllers: [SessionsServiceController],
  providers: [
    SessionsService,
    SessionsRepository,
    RunningSessionsProcessor,
    CompletedSessionsProcessor,
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
