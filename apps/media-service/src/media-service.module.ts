import { Module } from '@nestjs/common';
import { MediaServiceController } from './media-service.controller';
import { MediaServiceService } from './media-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule, JwtStrategy, LoggerModule, RateLimiterModule } from '@app/common';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { Photo } from './models/photo.model';
import { envSchema } from './validators/config.validator';
import { DeleteThrottleGuard, UploadThrottleGuard } from './guards/rate-limit.guard';
import { PhotoRepository } from './repos/photo.repository';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env','./apps/media-service/.env'],
      validate: (config)=> {
        const parsed = envSchema.safeParse(config);
        if (parsed.success) return parsed.data;
        console.error('ERROR validating environment variables', parsed.error);
        process.exit(1);
      }
    }),
    MulterModule.register({
      storage:memoryStorage()
    }),
    CloudinaryModule,
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([Photo]),
    LoggerModule.forService('media-service'),
    RateLimiterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [
          {
            name: 'upload',
            ttl: Number(cs.getOrThrow('RATE_LIMIT_UPLOAD_TTL')),
            limit: Number(cs.getOrThrow('RATE_LIMIT_UPLOAD_LIMIT')),
          },
          {
            name: 'delete',
            ttl: Number(cs.getOrThrow('RATE_LIMIT_DELETE_TTL')),
            limit: Number(cs.getOrThrow('RATE_LIMIT_DELETE_LIMIT')),
          },
        ],
      }),
    }),
  ],
  controllers: [MediaServiceController],
  providers: [MediaServiceService,JwtStrategy,UploadThrottleGuard,DeleteThrottleGuard,PhotoRepository],
})
export class MediaServiceModule {}
