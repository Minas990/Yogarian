import { NestFactory } from '@nestjs/core';
import { NotificationsServiceModule } from './notifications-service.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { KAFKA_BROKER } from '@app/kafka';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(NotificationsServiceModule);
  const cs = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: cs.get<string>('KAFKA_CLIENT_ID') || 'yoga-notifications',
        brokers: cs.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
      },
      consumer: {
        groupId: cs.get<string>('KAFKA_CONSUMER_GROUP_ID') || 'notifications-service-consumer'
      }
    }
  })
  app.set('trust proxy', 1);
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  await app.startAllMicroservices();
  await app.listen(cs.get<number>('NOTIFICATIONS_PORT') ?? 8007);
}
bootstrap();
