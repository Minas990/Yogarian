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
import { CreatePaymentCheckoutCommand, CreatePaymentCheckoutResponse, RefundReservationCommand, RefundReservationResponse } from '@app/common/commands/payment.command';
import { AppLoggerService, RefundConfirmedEvent, RefundFailedEvent } from '@app/common';
import { PaymentConfirmedEvent, PaymentFailedEvent } from '@app/common/events/payment.event';

@Injectable()
export class PaymentServiceService {
  private readonly stripe:Stripe;
  constructor(private readonly configService:ConfigService, @InjectRepository(PaymentEntity) private readonly paymentRepo: Repository<PaymentEntity>, @Inject(KAFKA_SERVICE) private readonly kafkaClient:ClientKafka,private readonly logger : AppLoggerService)
  {
    this.stripe = new Stripe(configService.getOrThrow<string>('STRIPE_SECRET_KEY'),{typescript: true})    
  }

  async createCheckoutSession(price: number,metadata?: Record<string,string>)
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
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), //least time possible in stripe is 30 minutes
      success_url: `http://localhost:8000`,//for testing
      cancel_url: `http://localhost:8000`, //for testing
      metadata: {
        ...metadata
      }
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
      
      const checkout = await this.createCheckoutSession(event.price,{sessionId:event.sessionId,userId:event.userId});
      
      payment.stripe_checkout_session_id = checkout.id; 
      payment.checkout_url = checkout.url?.toString() ?? "";
      payment.amount = event.price;
      payment.status = PaymentStatus.AWAITING_WEBHOOK;
      await this.paymentRepo.save(payment);
      const publishedEvent = new CreatePaymentCheckoutResponse({
        sessionId: event.sessionId,
        requestId: event.requestId,
        checkout_url: payment.checkout_url,
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
    const payload = (req as any).rawBody;

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
          if(event.data.object.payment_status === 'paid')
          {
            payment.status = PaymentStatus.SUCCEEDED;
            payment.payment_intent_id = event.data.object.payment_intent?.toString() ?? "";
            const amount = event.data.object.amount_total ?? 0  ;
            payment.amount = amount / 100;
            await this.paymentRepo.save(payment);
            this.kafkaClient.emit(KAFKA_TOPICS.PAYMENT_CONFIRMED, new PaymentConfirmedEvent({
              sessionId: payment.sessionId ,
              requestId: payment.requestId,
              price : payment.amount,

            }));
          }
          else if( event.data.object.payment_status === 'unpaid')//this is impossible since we only support payment on checkout, and no async payment methods, but just in case
          {
            console.log('Payment failed for session ',payment.sessionId,' and request ', payment.requestId);
          }
        }
        break;
      case 'checkout.session.expired':
        {
          const payment = await this.paymentRepo.findOneBy({stripe_checkout_session_id: event.data.object.id});
          if(!payment) //immpossible but just in case
            return ;
          if(payment.status !== PaymentStatus.AWAITING_WEBHOOK) //already processed or something is wrong
            return;
          payment.status = PaymentStatus.EXPIRED;
          await this.paymentRepo.save(payment);
          this.kafkaClient.emit(KAFKA_TOPICS.PAYMENT_FAILED, new PaymentFailedEvent({
            sessionId: payment.sessionId ,
            requestId: payment.requestId,
            failure_reason: 'Payment session expired without completion',
          }));
        }
        break;

      case 'refund.created': 
      {
        const refund = event.data.object as Stripe.Refund;
        const paymentIntentId = refund.payment_intent?.toString() ?? "";
        this.logger.logInfo({
          message: `Received refund.created webhook from Stripe (refund_id: ${refund.id}, payment_intent: ${paymentIntentId})`,
          functionName: 'handleStripeWebhook',
          additionalData: { refundId: refund.id, paymentIntentId },
        });

        const payment = await this.paymentRepo.findOneBy({payment_intent_id: paymentIntentId});
        if(!payment) {
          this.logger.logError({
            problem: `Received refund.created webhook but payment not found for payment_intent ${paymentIntentId}`,
            functionName: 'handleStripeWebhook',
            error: new Error('Payment not found'),
            additionalData: { refundId: refund.id, paymentIntentId },
          });
          return;
        }

        if(payment.status === PaymentStatus.REFUND_PENDING || payment.status === PaymentStatus.REFUNDED) {
          this.logger.logInfo({
            message: `Refund already processed or pending (refund_id: ${refund.id}, current_status: ${payment.status})`,
            functionName: 'handleStripeWebhook',
            additionalData: { refundId: refund.id, paymentStatus: payment.status },
          });
          return;
        }

        this.logger.logInfo({
          message: `Processing refund.created webhook (refund_id: ${refund.id}, payment_id: ${payment.requestId})`,
          functionName: 'handleStripeWebhook',
          additionalData: { refundId: refund.id, requestId: payment.requestId },
        });

        payment.refund_id = refund.id;
        payment.refund_reason = refund.reason ?? "";
        payment.refundAt = new Date(refund.created * 1000);
        payment.status = PaymentStatus.REFUND_PENDING;
        await this.paymentRepo.save(payment);
      }
      break;

      case 'refund.updated':
        {
          const refund = event.data.object as Stripe.Refund;
          const paymentIntentId = refund.payment_intent?.toString() ?? "";
          this.logger.logInfo({
            message: `Received refund.updated webhook from Stripe (refund_id: ${refund.id}, status: ${refund.status})`,
            functionName: 'handleStripeWebhook',
            additionalData: { refundId: refund.id, refundStatus: refund.status },
          });

          const payment = await this.paymentRepo.findOneBy({payment_intent_id: paymentIntentId});
          if(!payment) {
            this.logger.logError({
              problem: `Received refund.updated webhook but payment not found (refund_id: ${refund.id})`,
              functionName: 'handleStripeWebhook',
              error: new Error('Payment not found'),
              additionalData: { refundId: refund.id, paymentIntentId },
            });
            return;
          }

          if(refund.status === 'succeeded')
          {
            if(payment.status === PaymentStatus.REFUNDED) {
              this.logger.logInfo({
                message: `Refund already processed (refund_id: ${refund.id}, request: ${payment.requestId}), skipping duplicate`,
                functionName: 'handleStripeWebhook',
                additionalData: { refundId: refund.id, requestId: payment.requestId, currentStatus: payment.status },
              });
              return;
            }

            this.logger.logInfo({
              message: `Refund succeeded (refund_id: ${refund.id}, request: ${payment.requestId}), emitting confirmation event`,
              functionName: 'handleStripeWebhook',
              additionalData: { refundId: refund.id, requestId: payment.requestId, sessionId: payment.sessionId },
            });

            payment.status = PaymentStatus.REFUNDED;
            await this.paymentRepo.save(payment);
            const event = new RefundConfirmedEvent({
              sessionId: payment.sessionId,
              requestId: payment.requestId,
              userId: payment.userId,
              price: payment.amount,
              createdAt: payment.refundAt,
            })
            this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_CONFIRMED,event)
          }
          else if(refund.status === 'failed')
          {
            if(payment.status === PaymentStatus.SUCCEEDED) {
              this.logger.logInfo({
                message: `Refund already processed as failed (refund_id: ${refund.id}, request: ${payment.requestId}), skipping duplicate`,
                functionName: 'handleStripeWebhook',
                additionalData: { refundId: refund.id, requestId: payment.requestId, currentStatus: payment.status },
              });
              return;
            }

            this.logger.logError({
              problem: `Refund failed (refund_id: ${refund.id}, request: ${payment.requestId}): ${refund.failure_reason || 'Unknown reason'}`,
              functionName: 'handleStripeWebhook',
              error: new Error(refund.failure_reason || 'Unknown refund failure'),
              additionalData: { refundId: refund.id, requestId: payment.requestId, sessionId: payment.sessionId },
            });

            payment.status = PaymentStatus.SUCCEEDED;
            payment.failure_reason = refund.failure_reason ?? 'Refund failed for unknown reason';
            await this.paymentRepo.save(payment);
            this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_FAILED, new RefundFailedEvent({
              sessionId: payment.sessionId,
              requestId: payment.requestId,
              userId: payment.userId,
              failure_reason: payment.failure_reason,
            }));
          }
        }
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }
  
  async refundReservation(command: RefundReservationCommand)
  {
    try 
    {
      this.logger.logInfo({
        message: `Processing refund command for request ${command.requestId} (session: ${command.sessionId}, user: ${command.userId})`,
        functionName: 'refundReservation',
        additionalData: { requestId: command.requestId, sessionId: command.sessionId, userId: command.userId },
      });

      const payment = await this.paymentRepo.findOneBy({sessionId: command.sessionId, requestId: command.requestId, userId: command.userId});
      if(!payment) {
        throw new Error('No payment found for this reservation');
      }
      
      this.logger.logInfo({
        message: `Found payment for refund (request: ${command.requestId}), status: ${payment.status}`,
        functionName: 'refundReservation',
        additionalData: { requestId: command.requestId, sessionId: command.sessionId, paymentStatus: payment.status },
      });

      if(payment.status !== PaymentStatus.SUCCEEDED) {
        throw new Error(`Cannot refund a payment that has not succeeded. Current status: ${payment.status}`);
      }

      if(!payment.payment_intent_id) {
        throw new Error('Payment has no Stripe intent ID - cannot process refund');
      }

      this.logger.logInfo({
        message: `Initiating Stripe refund for payment intent ${payment.payment_intent_id} (request: ${command.requestId})`,
        functionName: 'refundReservation',
        additionalData: { requestId: command.requestId, paymentIntentId: payment.payment_intent_id },
      });

      await this.stripe.refunds.create({
        payment_intent: payment.payment_intent_id,
        reason: 'requested_by_customer',
      });

      this.logger.logInfo({
        message: `Refund successfully initiated with Stripe for request ${command.requestId}`,
        functionName: 'refundReservation',
        additionalData: { requestId: command.requestId, sessionId: command.sessionId },
      });

      this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_RESPONSE, new RefundReservationResponse({
        sessionId: command.sessionId,
        requestId: command.requestId,
        success: true,
      }));
    }
    catch(error)
    {
      this.logger.logError({
        problem: `Failed to refund payment for request ${command.requestId} (session: ${command.sessionId}): ${error.message}`,
        functionName: 'refundReservation',
        error: error,
        additionalData: { requestId: command.requestId, sessionId: command.sessionId },
      });
      this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_RESPONSE, new RefundReservationResponse({
        sessionId: command.sessionId,
        requestId: command.requestId,
        success: false,
        failure_reason: error.message,
      }));
    }
  }
}
