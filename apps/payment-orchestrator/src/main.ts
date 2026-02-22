import { NestFactory } from '@nestjs/core';
import { PaymentOrchestratorModule } from './payment-orchestrator.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentOrchestratorModule);
  await app.listen(process.env.port ?? 3000);
}
bootstrap();
