import { NestFactory } from '@nestjs/core';
import { UsersServiceModule } from './users-service.module';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { KAFKA_BROKER } from '@app/kafka';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(UsersServiceModule);
  const configService = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.KAFKA,
      options : {
        client: {
          clientId: configService.get<string>('KAFKA_CLIENT_ID') || 'yoga-users',
          brokers: configService.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
        },
        consumer:{ 
          groupId: configService.get<string>('KAFKA_CONSUMER_GROUP_ID') || 'users-service-consumer'
        }
      }
    }
  )
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  await app.startAllMicroservices();
  await app.listen(configService.get('USERS_PORT') ?? 8002);
}
bootstrap();
