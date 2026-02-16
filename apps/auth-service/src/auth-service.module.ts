import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule, JwtStrategy, RateLimiterModule, LoggerModule, RequestLoggerInterceptor } from '@app/common';
import { DatabaseModule } from '@app/database';
import { KafkaModule } from '@app/kafka';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthUserRepository } from './repo/user.repository';
import { AuthUser } from './models/auth-user.model';
import { DatabaseErrorFilter } from './filters/database-error.filter';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SensitiveThrottleGuard, ShortThrottleGuard } from './guards/rate-limit.guard';
import { CleanupProcessor } from './cleanup/cleanup.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env','./apps/auth-service/.env']
    }),
    LoggerModule.forService('auth-service'),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([AuthUser]),
    PassportModule,
    JwtModule.registerAsync({
      inject:[ConfigService],
      useFactory: (cs :ConfigService) => ({
        global:true,
        secret: cs.getOrThrow<string>('JWT_SECRET'),
        signOptions: {expiresIn:cs.get('JWT_EXPIRES_IN') || '1h'}
      })
    }),
    RateLimiterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [
          {
            name: 'short',
            ttl: Number(cs.getOrThrow('RATE_LIMIT_SHORT_TTL')),
            limit: Number(cs.getOrThrow('RATE_LIMIT_SHORT_LIMIT')),
          },
          {
            name: 'sensitive',
            ttl: Number(cs.getOrThrow('RATE_LIMIT_SENSITIVE_TTL')),
            limit: Number(cs.getOrThrow('RATE_LIMIT_SENSITIVE_LIMIT')),
          },
        ],
      }),
    }),
  ],
  controllers: [AuthServiceController],
  providers: [
    AuthServiceService,
    JwtStrategy,
    AuthUserRepository,
    ShortThrottleGuard,
    SensitiveThrottleGuard,
    CleanupProcessor,
    {
      provide: APP_FILTER,
      useClass: DatabaseErrorFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggerInterceptor,
    },
  ],
})
export class AuthServiceModule {}
