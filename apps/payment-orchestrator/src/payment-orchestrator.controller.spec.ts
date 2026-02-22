import { Test, TestingModule } from '@nestjs/testing';
import { PaymentOrchestratorController } from './payment-orchestrator.controller';
import { PaymentOrchestratorService } from './payment-orchestrator.service';

describe('PaymentOrchestratorController', () => {
  let paymentOrchestratorController: PaymentOrchestratorController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [PaymentOrchestratorController],
      providers: [PaymentOrchestratorService],
    }).compile();

    paymentOrchestratorController = app.get<PaymentOrchestratorController>(PaymentOrchestratorController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(paymentOrchestratorController.getHello()).toBe('Hello World!');
    });
  });
});
