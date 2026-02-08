import { Module } from '@nestjs/common';
import { NotificationsServiceController } from './notifications-service.controller';
import { KafkaModule } from '@app/kafka';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { LoggerModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/notifications-service/.env'],
    }),
    KafkaModule.register(),
    LoggerModule.forService('notifications-service'),
    EmailModule,
  ],
  controllers: [NotificationsServiceController],
  providers: [],
})
export class NotificationsServiceModule {}
