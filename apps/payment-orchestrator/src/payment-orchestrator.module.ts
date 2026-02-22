import { Module } from '@nestjs/common';
import { PaymentOrchestratorController } from './payment-orchestrator.controller';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

@Module({
  imports: [],
  controllers: [PaymentOrchestratorController],
  providers: [PaymentOrchestratorService],
})
export class PaymentOrchestratorModule {}
