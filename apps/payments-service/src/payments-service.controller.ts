import { Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import { PaymentServiceService } from './payments-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import {type Request,type Response } from 'express';
import { CreatePaymentCheckoutCommand, RefundReservationCommand } from '@app/common/commands/payment.command';

@Controller('payment')
export class PaymentServiceController {
  constructor(private readonly paymentServiceService: PaymentServiceService) {}

  @Post('webhook')
  async handleStripeWebhook(
    @Req() request: Request,
    @Res() response: Response,
    @Headers('stripe-signature') signature: string
  )
  {
    try {
      await this.paymentServiceService.handleStripeWebhook(request, signature);
    } catch (error) {
      return response.status(400).send(`Webhook Error: ${error.message}`);
    }
    return response.json({received: true});
  }

  @EventPattern(KAFKA_TOPICS.CREATE_PAYMENT_CHECKOUT_COMMAND)
  async handleReservationPaymentCreated(@Payload() data: CreatePaymentCheckoutCommand)
  {
    return this.paymentServiceService.createPayment(data);
  }

  @EventPattern(KAFKA_TOPICS.REFUND_RESERVATION_COMMAND)
  async handleRefundReservationCommand(@Payload() data: RefundReservationCommand)
  {
    return this.paymentServiceService.refundReservation(data);
  }
}
