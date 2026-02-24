import { NestFactory } from '@nestjs/core';
import { SearchServiceModule } from './search-service.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '@app/kafka';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(SearchServiceModule);
  const configService = app.get(ConfigService);
  app.set('trust proxy', true);
  app.connectMicroservice<MicroserviceOptions>({
    transport:Transport.KAFKA,
    options: {
      consumer: {
        groupId: configService.get('KAFKA_CONSUMER_GROUP_ID') || 'search-service-consumer',
      },
      client: {
        brokers: configService.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER],
        clientId: configService.get('KAFKA_CLIENT_ID') || 'search-service',
      }
    }
  });
  await app.startAllMicroservices();
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
