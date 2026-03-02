import { AppLoggerService, RefundConfirmedEvent, RefundFailedEvent, ReservationCancelledEvent, ReservationConfirmedEvent } from '@app/common';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './models/reservation.model';
import { In, Repository } from 'typeorm';
import { ReservationStatus } from '@app/common/types/reservation-status.type';
import { CheckSessionUpcomingForRefundCommand, CheckSessionUpcomingForRefundResponse, CheckSessionsAvailableCommand, CheckSessionsAvailableResponse } from '@app/common/commands/sessions,command';
import { CreatePaymentCheckoutCommand, CreatePaymentCheckoutResponse, RefundReservationCommand, RefundReservationResponse } from '@app/common/commands/payment.command';
import { PaymentConfirmedEvent, PaymentFailedEvent } from '@app/common/events/payment.event';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from './queue/queues.constants';
import { Queue } from 'bullmq';


@Injectable()
export class ReservationsServiceService {
  constructor(
    private readonly logger: AppLoggerService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    @InjectRepository(Reservation) private readonly reservationRepository: Repository<Reservation>,
    @InjectQueue(QUEUE_CONSTANTS.REFUND_TIMEOUT) private readonly refundTimeoutQueue: Queue,
  ){}

  async book(userId: string, sessionId: string)
  {
    const oldReservation = await this.getReservation(userId,sessionId).catch(() => null);
    if(oldReservation && [
      ReservationStatus.PENDING_VALIDATION,
      ReservationStatus.VALIDATION_APPROVED,
      ReservationStatus.AWAITING_PAYMENT,
      ReservationStatus.CONFIRMED,
      ReservationStatus.REFUND_PENDING,
    ].includes(oldReservation.status))
      throw new ConflictException('Reservation already exists');
    
    const reservation = await this.reservationRepository.save({
      userId,
      sessionId,
      requestId: crypto.randomUUID(),
    });
    const event = new CheckSessionsAvailableCommand({
      sessionId,
      requestId: reservation.requestId,
    });
    this.kafkaClient.emit(KAFKA_TOPICS.CHECK_SESSIONS_AVAILABLE_COMMAND, event);
    return reservation.requestId;
  }

  async getReservationStatus(userId: string, requestId: string)
  {
    const reservation = await this.reservationRepository.findOneBy({userId,requestId});
    if(!reservation)
      throw new NotFoundException('Reservation not found');
    return {
      status: reservation.status,
      failure_reason: reservation.failure_reason,
      checkout_url: reservation.checkout_url,
    };
  }

  async getReservation(userId: string, sessionId: string)
  {
    const reservations = await this.reservationRepository.findOneBy({userId,sessionId});
    if(!reservations)
      throw new NotFoundException('Reservation not found');
    return reservations;
  }

  async cancelReservation(userId: string, requestId: string)
  {
    const reservation = await this.reservationRepository.findOneBy({userId,requestId,
      status: In([ReservationStatus.AWAITING_PAYMENT, ReservationStatus.VALIDATION_APPROVED])
    });// Only allow cancellation if reservation is still awaiting payment or validation approved
    if(!reservation)
      throw new NotFoundException('Reservation not found');
    reservation.status = ReservationStatus.CANCELLED;
    await this.reservationRepository.save(reservation);
    const event = new ReservationCancelledEvent({
      sessionId: reservation.sessionId,
      requestId: reservation.requestId,
    });
    this.kafkaClient.emit(KAFKA_TOPICS.RESERVATION_CANCELLED, event);
  }

  async updateReservation(requestId: string, updateData: Partial<Reservation>)
  {
    const reservation = await this.reservationRepository.findOneBy({requestId});
    if(!reservation) throw new NotFoundException('Reservation not found');
    Object.assign(reservation,updateData);
    return this.reservationRepository.save(reservation);
  }

  async handleCheckSessionsAvailableResponse(data: CheckSessionsAvailableResponse)
  {
    const result = await this.updateReservation(data.requestId,{
      status: data.available ? ReservationStatus.VALIDATION_APPROVED : ReservationStatus.VALIDATION_FAILED,
      failure_reason: data.available ? null : data.failure_reason,
    }) ;
    if(!data.available) return ; //there will be a job that delete this validation failed reservation after some time, so no need to delete it here
    const event = new CreatePaymentCheckoutCommand({
      requestId: data.requestId,
      sessionId: data.sessionId,
      price: data.price,
      userId: result.userId
    })
    this.kafkaClient.emit(KAFKA_TOPICS.CREATE_PAYMENT_CHECKOUT_COMMAND, event); 
  }

  async handleCreatePaymentCheckoutResponse(data: CreatePaymentCheckoutResponse)
  {
    if(data.failed_reason)
    {
      await this.updateReservation(data.requestId,{
        status: ReservationStatus.FAILED,
        failure_reason: data.failed_reason,
      });
      this.kafkaClient.emit(KAFKA_TOPICS.RESERVATION_CANCELLED, new ReservationCancelledEvent({
        sessionId: data.sessionId,
        requestId: data.requestId,
      }));
      return ;
    }
    await this.updateReservation(data.requestId,{
      status: ReservationStatus.AWAITING_PAYMENT,
      checkout_url: data.checkout_url,
    });
    return;
  }

  async handlePaymentConfirmed(data: PaymentConfirmedEvent)
  {
    const reservation = await this.updateReservation(data.requestId,{
      status: ReservationStatus.CONFIRMED,
      locked_price: data.price,
    });
    const event = new ReservationConfirmedEvent({
      sessionId: reservation.sessionId,
      userId: reservation.userId,
      price: reservation.locked_price,
      createdAt: reservation.createdAt,
      requestId: reservation.requestId,
    })
    this.kafkaClient.emit(KAFKA_TOPICS.RESERVATION_CONFIRMED,event);
  }

  async handlePaymentFailed(data: PaymentFailedEvent)
  {
    console.log(data);
    await this.updateReservation(data.requestId,{
      status: ReservationStatus.FAILED,
      failure_reason: data.failure_reason,
    }); // there will be a job that delete this failed reservation after some time, so no need to delete it here
    this.logger.logInfo({
      message: `Payment failed for reservation ${data.requestId} of session ${data.sessionId}: ${data.failure_reason}`,
      functionName: 'handlePaymentFailed',
    })
    this.kafkaClient.emit(KAFKA_TOPICS.RESERVATION_CANCELLED, new ReservationCancelledEvent({
        sessionId: data.sessionId,
        requestId: data.requestId,
      }));
  }

  async refundReservation(userId: string, sessionId: string)
  {
    const reservation = await this.reservationRepository.findOneBy({userId,sessionId,status: ReservationStatus.CONFIRMED});
    if(!reservation) {
      this.logger.logError({
        problem: `No confirmed reservation found for session ${sessionId} by user ${userId}`,
        functionName: 'refundReservation',
        error: new NotFoundException('No confirmed reservation found for this session'),
      });
      throw new NotFoundException('No confirmed reservation found for this session');
    }
    this.logger.logInfo({
      message: `Initiating refund for reservation ${reservation.requestId} (session: ${sessionId}, user: ${userId})`,
      functionName: 'refundReservation',
      additionalData: { requestId: reservation.requestId, sessionId, userId },
    });
    const command = new CheckSessionUpcomingForRefundCommand({
      sessionId,
      requestId: reservation.requestId,
    });
    this.kafkaClient.emit(KAFKA_TOPICS.CHECK_SESSION_UPCOMING_FOR_REFUND_COMMAND,command);
    return reservation.requestId;
  }

  async handleCheckSessionUpcomingForRefundResponse(data: CheckSessionUpcomingForRefundResponse)
  {
    const reservation = await this.reservationRepository.findOneBy({sessionId: data.sessionId, requestId: data.requestId});
    if(!reservation) {
      this.logger.logError({
        problem: `Received refund-check response but reservation not found (session: ${data.sessionId}, request: ${data.requestId})`,
        functionName: 'handleCheckSessionUpcomingForRefundResponse',
        error: new Error('Reservation not found'),
        additionalData: { sessionId: data.sessionId, requestId: data.requestId },
      });
      return;
    }

    if(!data.canRefund)
    {
      this.logger.logInfo({
        message: `Session validation failed for refund (session: ${data.sessionId}, request: ${data.requestId}): ${data.failure_reason || 'Session is not upcoming'}`,
        functionName: 'handleCheckSessionUpcomingForRefundResponse',
        additionalData: { sessionId: data.sessionId, requestId: data.requestId, canRefund: false, reason: data.failure_reason },
      });
      reservation.failure_reason = `Refund rejected: ${data.failure_reason || 'Session is not upcoming'}`;
      await this.reservationRepository.save(reservation);
      return;
    }

    this.logger.logInfo({
      message: `Session validation passed for refund, proceeding to payment refund (session: ${data.sessionId}, request: ${data.requestId})`,
      functionName: 'handleCheckSessionUpcomingForRefundResponse',
      additionalData: { sessionId: data.sessionId, requestId: data.requestId, canRefund: true },
    });
    const command = new RefundReservationCommand({
      sessionId: data.sessionId,
      requestId: data.requestId,
      userId: reservation.userId,
    });
    this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_COMMAND,command);
  }

  async handleRefundReservationResponse(data: RefundReservationResponse)
  {
    if(!data.success)
    {
      this.logger.logError({
        problem: `Payment refund failed for request ${data.requestId} (session: ${data.sessionId}): ${data.failure_reason || 'Unknown reason'}`,
        error: new Error(data.failure_reason),
        functionName: 'handleRefundReservationResponse',
        additionalData: { sessionId: data.sessionId, requestId: data.requestId, failureReason: data.failure_reason },
      });
      const reservation = await this.reservationRepository.findOneBy({sessionId: data.sessionId, requestId: data.requestId});
      if(!reservation) {
        this.logger.logError({
          problem: `Could not find reservation to update after payment refund failure (session: ${data.sessionId}, request: ${data.requestId})`,
          functionName: 'handleRefundReservationResponse',
          error: new Error('Reservation not found'),
        });
        return;
      }
      reservation.failure_reason = `Refund failed: ${data.failure_reason}`; 
      reservation.status = ReservationStatus.CONFIRMED;
      await this.reservationRepository.save(reservation);
      return ;
    }
    
    this.logger.logInfo({
      message: `Payment refund initiated successfully, setting reservation to REFUND_PENDING (request: ${data.requestId}, session: ${data.sessionId})`,
      functionName: 'handleRefundReservationResponse',
      additionalData: { sessionId: data.sessionId, requestId: data.requestId, status: ReservationStatus.REFUND_PENDING },
    });
    await this.reservationRepository.update({sessionId: data.sessionId, requestId: data.requestId},{
      status: ReservationStatus.REFUND_PENDING,
      failure_reason: '',
    });
    
    await this.refundTimeoutQueue.add(
      'refund-timeout-check',
      { requestId: data.requestId, sessionId: data.sessionId },
      {
        delay: 30 * 60 * 1000, // 30 minutes
        removeOnComplete: true,
      }
    );
    this.logger.logInfo({
      message: `Scheduled refund timeout job for request ${data.requestId} (checks in 30 minutes)`,
      functionName: 'handleRefundReservationResponse',
      additionalData: { requestId: data.requestId, sessionId: data.sessionId },
    });
  }

  async handleRefundReservationConfirmed(data: RefundConfirmedEvent)
  {
    this.logger.logInfo({
      message: `Refund confirmed by Stripe, updating reservation to REFUNDED (request: ${data.requestId}, session: ${data.sessionId})`,
      functionName: 'handleRefundReservationConfirmed',
      additionalData: { sessionId: data.sessionId, requestId: data.requestId, status: ReservationStatus.REFUNDED },
    });
    await this.reservationRepository.update({sessionId: data.sessionId, requestId: data.requestId},{
      status: ReservationStatus.REFUNDED,
    });
    
    // Remove the timeout job since refund succeeded
    const jobs = await this.refundTimeoutQueue.getJobs(['delayed', 'waiting', 'active']);
    for (const job of jobs) {
      if (job.data?.requestId === data.requestId) {
        await job.remove();
        this.logger.logInfo({
          message: `Cancelled refund timeout job for request ${data.requestId}`,
          functionName: 'handleRefundReservationConfirmed',
          additionalData: { requestId: data.requestId, sessionId: data.sessionId },
        });
      }
    }
  }

  async handleRefundReservationFailed(data: RefundFailedEvent)
  {
    this.logger.logError({
      problem: `Refund failed by Stripe for request ${data.requestId} (session: ${data.sessionId}): ${data.failure_reason || 'Unknown reason'}`,
      functionName: 'handleRefundReservationFailed',
      error: new Error(data.failure_reason),
      additionalData: { sessionId: data.sessionId, requestId: data.requestId, failureReason: data.failure_reason },
    });
    await this.reservationRepository.update({sessionId: data.sessionId, requestId: data.requestId},{
      status: ReservationStatus.CONFIRMED,
      failure_reason: data.failure_reason || "Unknown failure reason"
    });
  }
}
