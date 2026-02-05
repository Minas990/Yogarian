import { NestFactory } from '@nestjs/core';
import { SessionsServiceModule } from './sessions-service.module';

async function bootstrap() {
  const app = await NestFactory.create(SessionsServiceModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
