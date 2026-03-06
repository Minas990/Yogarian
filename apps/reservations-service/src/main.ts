import { NestFactory } from '@nestjs/core';
import { ReservationsServiceModule } from './reservations-service.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KAFKA_BROKER } from '@app/kafka';
import { attachUserMetadataMiddleware } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ReservationsServiceModule);
  app.set('trust proxy', 1);
  app.use(attachUserMetadataMiddleware);
  const cs = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport:Transport.KAFKA,
    options: {
      client: {
        brokers: [KAFKA_BROKER],
        clientId: cs.get('KAFKA_CLIENT_ID') || 'reservations-service-client',
      },
      consumer: {
        groupId: cs.get('KAFKA_CONSUMER_GROUP_ID') || 'reservations-service-consumer-group',
      },
    },
  })
  await app.startAllMicroservices();
  await app.listen(cs.get('RESERVATIONS_PORT') || 8008);
}
bootstrap();
