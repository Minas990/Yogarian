import { NestFactory } from '@nestjs/core';
import { ReservationsServiceModule } from './reservations-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ReservationsServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
