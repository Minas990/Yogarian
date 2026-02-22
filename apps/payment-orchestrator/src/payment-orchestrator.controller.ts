import { Controller, Get } from '@nestjs/common';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

@Controller()
export class PaymentOrchestratorController {
  constructor(private readonly paymentOrchestratorService: PaymentOrchestratorService) {}

  @Get()
  getHello(): string {
    return this.paymentOrchestratorService.getHello();
  }
}
