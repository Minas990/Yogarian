import { Module } from '@nestjs/common';
import { SearchServiceController } from './search-service.controller';
import { SearchServiceService } from './search-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { Follow } from './models/follow.model';
import { User } from './models/User.entity';
import { Session } from './models/session.model';
import { Reservation } from './models/reservations.model';
import { JwtAuthGuard, LoggerModule, RateLimiterModule } from '@app/common';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { Photo } from './models/photos.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','apps/search-service/.env']
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([Follow,User,Session,Reservation,Photo]),
    LoggerModule.forService('SearchService'),
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
  ],
  controllers: [SearchServiceController],
  providers: [SearchServiceService ,MediumThrottleGuard,
      LongThrottleGuard,
      JwtAuthGuard,
       ],
})
export class SearchServiceModule {}
