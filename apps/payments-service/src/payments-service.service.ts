import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { PaymentEntity } from './models/payment.model';
import { Repository } from 'typeorm';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { PaymentStatus } from '@app/common/types/payment-status.type';
import {type Request, type Response } from 'express';
import { CreatePaymentCheckoutCommand, CreatePaymentCheckoutResponse } from '@app/common/commands/payment.command';
import { AppLoggerService } from '@app/common';
import { PaymentConfirmedEvent, PaymentFailedEvent } from '@app/common/events/payment.event';

@Injectable()
export class PaymentServiceService {
  private readonly stripe:Stripe;
  constructor(private readonly configService:ConfigService, @InjectRepository(PaymentEntity) private readonly paymentRepo: Repository<PaymentEntity>, @Inject(KAFKA_SERVICE) private readonly kafkaClient:ClientKafka,private readonly logger : AppLoggerService)
  {
    this.stripe = new Stripe(configService.getOrThrow<string>('STRIPE_SECRET_KEY'),{typescript: true})    
  }

  async createCheckoutSession(price: number)
  {
      return  await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Yoga Session',
            },
            unit_amount: price * 100, //amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:8000`,//for testing
      cancel_url: `http://localhost:8000`, //for testing
    });
  }

  async createPayment(event: CreatePaymentCheckoutCommand)
  {
    try 
    {
      const  payment = await  this.paymentRepo.save({
        requestId: event.requestId,
        sessionId: event.sessionId,
        amount: event.price,
        userId: event.userId
      });
      
      const checkout = await this.createCheckoutSession(event.price);
      console.log(checkout);
      payment.stripe_checkout_session_id = checkout.id; 
      payment.checkout_url = checkout.url?.toString() ?? "";
      payment.amount = event.price;
      payment.status = PaymentStatus.AWAITING_WEBHOOK;
      await this.paymentRepo.save(payment);
      const publishedEvent = new CreatePaymentCheckoutResponse({
        sessionId: event.sessionId,
        requestId: event.requestId,
        checkout_url: payment.checkout_url,
        payment_intent_id: payment.stripe_checkout_session_id,
      });
      
      this.kafkaClient.emit(KAFKA_TOPICS.CREATE_PAYMENT_CHECKOUT_RESPONSE, publishedEvent);
      this.logger.logInfo({
        message: `Created payment checkout for session ${event.sessionId} and request ${event.requestId}`,
        functionName: 'createPayment',
      })
      return ;
    }
    catch(error)
    {
      await this.paymentRepo.delete({sessionId: event.sessionId, requestId: event.requestId});//if the checkout creation failed for any reason, we delete the payment record to allow retrying the booking process without conflicts with existing payment records
      const publishedEvent = new CreatePaymentCheckoutResponse({
        sessionId: event.sessionId,
        requestId: event.requestId,
        failed_reason: error.message,
      });
      this.kafkaClient.emit(KAFKA_TOPICS.CREATE_PAYMENT_CHECKOUT_RESPONSE, publishedEvent);
      this.logger.logError({
        problem: `Failed to create payment checkout for session ${event.sessionId} and request ${event.requestId}: ${error.message}`,
        functionName: 'createPayment',
        error: error,
      })
      return ;
    }
  }

  async handleStripeWebhook(req:Request, signature: string)
  {
    const payload = (req as any).rawBody ?? req.body;

    const event =  this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.configService.getOrThrow<string>('STRIPE_WEBHOOK_SECRET')
    );
    switch (event.type) 
    {
      case 'checkout.session.completed':
        {
          const payment = await this.paymentRepo.findOneBy({stripe_checkout_session_id: event.data.object.id});
          if(!payment) //immpossible but just in case
            return ;
          if(payment.status === PaymentStatus.SUCCEEDED) //already processed
            return;
          if(payment.status !== PaymentStatus.AWAITING_WEBHOOK) //something is wrong 
            return;
          payment.status = PaymentStatus.SUCCEEDED;
          const amount = event.data.object.amount_total ?? 0  ;
          console.log(amount)
          payment.amount = amount / 100;
          await this.paymentRepo.save(payment);
          this.kafkaClient.emit(KAFKA_TOPICS.PAYMENT_CONFIRMED, new PaymentConfirmedEvent({
            sessionId: payment.sessionId ,
            requestId: payment.requestId,
            price : payment.amount,
          }))
        

        }
        break;
      case 'payment_intent.payment_failed':
        {
          const payment = await this.paymentRepo.findOneBy({stripe_checkout_session_id: event.data.object.id});
          if(!payment) return;
          payment.status = PaymentStatus.FAILED;
            payment.failure_reason = event.data.object.status;
            await this.paymentRepo.save(payment);
            this.kafkaClient.emit(KAFKA_TOPICS.PAYMENT_FAILED, new PaymentFailedEvent({
              requestId: payment.requestId,
              failure_reason: payment.failure_reason ?? "Unknown failure reason",
              sessionId: payment.sessionId,
            }))
        }
      default: 
        console.log(`Unhandled event type ${event.type}`);
        break;
    }
  }
}
