import { NestFactory } from '@nestjs/core';
import { MediaServiceModule } from './media-service.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '@app/kafka';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(MediaServiceModule);
  const cs = app.get(ConfigService);
  app.set('trust proxy', 1);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      consumer: {
        groupId: cs.get<string>('KAFKA_CONSUMER_GROUP_ID') || 'media-service-consumer'
      },
      client: {
        clientId: cs.get<string>('KAFKA_CLIENT_ID') || 'yoga-media',
        brokers: cs.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
      } 
    }
  })
  await app.startAllMicroservices();
  await app.listen(cs.get('MEDIA_PORT') ?? 8003);
} 
bootstrap();
