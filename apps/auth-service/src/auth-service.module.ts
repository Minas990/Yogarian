import { Module } from '@nestjs/common';
import { AuthServiceController } from './auth-service.controller';
import { AuthServiceService } from './auth-service.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule, JwtStrategy } from '@app/common';
import { DatabaseModule } from '@app/database';
import { KafkaModule } from '@app/kafka';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthUserRepository } from './repo/user.repository';
import { AuthUser } from './models/auth-user.model';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DatabaseErrorFilter } from './filters/database-error.filter';
import { APP_FILTER } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env','./apps/auth-service/.env']
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([AuthUser]),
    MulterModule.register({
      storage: memoryStorage()
    }),
    CloudinaryModule,
    PassportModule,
    JwtModule.registerAsync({
      inject:[ConfigService],
      useFactory: (cs :ConfigService) => ({
        global:true,
        secret: cs.getOrThrow<string>('JWT_SECRET'),
        signOptions: {expiresIn:cs.get('JWT_EXPIRES_IN') || '1h'}
      })
    }),
  ],
  controllers: [AuthServiceController],
  providers: [
    AuthServiceService,
    JwtStrategy,
    AuthUserRepository,
    {
      provide: APP_FILTER,
      useClass: DatabaseErrorFilter,
    },
  ],
})
export class AuthServiceModule {}
