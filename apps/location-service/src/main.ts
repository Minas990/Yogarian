import { NestFactory } from '@nestjs/core';
import { LocationServiceModule } from './location-service.module';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { KAFKA_BROKER } from '@app/kafka';
import { LOCATION_PACKAGE_NAME } from '@app/common/generated/location';
import { attachUserMetadataMiddleware } from '@app/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(LocationServiceModule);
  app.set('trust proxy', true);
  app.use(attachUserMetadataMiddleware);
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
  });
  app.connectMicroservice({
    transport: Transport.GRPC,
    options: {
      package: LOCATION_PACKAGE_NAME,
      url:  cs.getOrThrow('LOCATION_SERVICE_URL') + ":" + cs.getOrThrow('LOCATION_GRPC_PORT'),
      protoPath: 'libs/common/src/proto/location.proto',
  }
  });
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  await app.startAllMicroservices();
  await app.listen(cs.get('LOCATION_PORT') || 8004);
}
bootstrap();
