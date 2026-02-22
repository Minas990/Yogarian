import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentOrchestratorService {
  getHello(): string {
    return 'Hello World!';
  }
}
