import { NestFactory } from '@nestjs/core';
import { LocationServiceModule } from './location-service.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { KAFKA_BROKER } from '@app/kafka';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LocationServiceModule);
  app.set('trust proxy', true);
  const cs = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
        consumer: {
          groupId: cs.get('KAFKA_CONSUMER_GROUP_ID') || 'location-service-consumer',
        },
        client : {
          brokers: cs.get('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER],
          clientId: cs.get('KAFKA_CLIENT_ID') || 'yoga-location',
        }
    }
  })
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  await app.startAllMicroservices();
  await app.listen(cs.get('LOCATION_PORT') || 8004);
}
bootstrap();
