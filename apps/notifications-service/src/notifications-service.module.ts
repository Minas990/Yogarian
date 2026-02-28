import { Module } from '@nestjs/common';
import { NotificationsServiceController } from './notifications-service.controller';
import { KafkaModule } from '@app/kafka';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import { LoggerModule } from '@app/common';
import { DatabaseModule } from '@app/database';
import { NotificationEmailTask } from './models/email-task.model';
import {  NotificationEvent } from './models/event.model';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from './queue/constants.queue';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications-service.service';
import { NotificationProcessor } from './queue/notification.processor';
import { NotificationOutboxPoller } from './queue/notification-outbox.poller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/notifications-service/.env'],
    }),
    LoggerModule.forService('notifications-service'),
    EmailModule,
    DatabaseModule,
    DatabaseModule.forFeature([NotificationEmailTask,NotificationEvent]),
    BullModule.forRootAsync({
       inject:[ConfigService],
       useFactory: (cs:ConfigService) => ({
        connection: {
          host: cs.getOrThrow('REDIS_HOST'),
          port: cs.getOrThrow('REDIS_PORT'),
          
        }
       })
    }),
    BullModule.registerQueue({
      name:QUEUE_CONSTANTS.NOTIFICATIONS_QUEUE
    }),
    ScheduleModule.forRoot()
  ],
  controllers: [NotificationsServiceController],
  providers: [
    NotificationsService,
    NotificationProcessor,
    NotificationOutboxPoller,
  ],
})
export class NotificationsServiceModule {}
