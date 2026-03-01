import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KAFKA_BROKER } from '@app/kafka';
import { PaymentServiceModule } from './payments-service.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(PaymentServiceModule);
  app.set('trust proxy', 1);
  const cs = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport:Transport.KAFKA,
    options: {
      client: {
        brokers: [KAFKA_BROKER],
        clientId: cs.get('KAFKA_CLIENT_ID') || 'payments-service-client',
      },
      consumer: {
        groupId: cs.get('KAFKA_CONSUMER_GROUP_ID') || 'payments-service-consumer-group',
      },
    },
  });

  app.use('/payment/webhook',bodyParser.raw({type: 'application/json'}));
  await app.startAllMicroservices();
  await app.listen(cs.get('PAYMENTS_PORT') || 8009);
}
bootstrap();
