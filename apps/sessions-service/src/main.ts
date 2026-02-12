import { NestFactory } from '@nestjs/core';
import { SessionsServiceModule } from './sessions-service.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '@app/kafka';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(SessionsServiceModule);
  const configService = app.get(ConfigService);
  app.set('trust proxy', 1);
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.KAFKA,
      options : {
        client: {
          clientId: configService.get<string>('KAFKA_CLIENT_ID') || 'yoga-users',
          brokers: configService.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
        },
        consumer:{ 
          groupId: configService.get<string>('KAFKA_CONSUMER_GROUP_ID') || 'sessions-service-consumer'
        }
      }
    }
  )
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  await app.startAllMicroservices();
  await app.listen(configService.get('SESSIONS_PORT') ?? 8003);
}
bootstrap();
