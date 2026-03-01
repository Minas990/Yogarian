import { AppLoggerService, ReservationCancelledEvent } from '@app/common';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './models/reservation.model';
import { In, Repository } from 'typeorm';
import { ReservationStatus } from '@app/common/types/reservation-status.type';
import { CheckSessionsAvailableCommand, CheckSessionsAvailableResponse } from '@app/common/commands/sessions,command';
import { CreatePaymentCheckoutCommand, CreatePaymentCheckoutResponse } from '@app/common/commands/payment.command';
import { PaymentConfirmedEvent, PaymentFailedEvent } from '@app/common/events/payment.event';
import { status } from '@grpc/grpc-js';

@Injectable()
export class ReservationsServiceService {
  constructor(
    private readonly logger: AppLoggerService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
    @InjectRepository(Reservation) private readonly reservationRepository: Repository<Reservation>
  ){}

  async book(userId: string, sessionId: string)
  {
    const oldReservation = await this.getReservation(userId,sessionId).catch(() => null);
    console.log('old reservation', oldReservation);
    if(oldReservation && [ReservationStatus.AWAITING_PAYMENT, ReservationStatus.VALIDATION_APPROVED].includes(oldReservation.status))
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
      status: ReservationStatus.AWAITING_PAYMENT
    });// Only allow cancellation if reservation is still awaiting payment
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
      payment_intent_id: data.payment_intent_id,
    });
    return;
  }

  async handlePaymentConfirmed(data: PaymentConfirmedEvent)
  {
    await this.updateReservation(data.requestId,{
      status: ReservationStatus.CONFIRMED,
      locked_price: data.price,
    });
  }

  async handlePaymentFailed(data: PaymentFailedEvent)
  {
    await this.updateReservation(data.requestId,{
      status: ReservationStatus.FAILED,
      failure_reason: data.failure_reason,
    }); // there will be a job that delete this failed reservation after some time, so no need to delete it here
    this.kafkaClient.emit(KAFKA_TOPICS.RESERVATION_CANCELLED, new ReservationCancelledEvent({
        sessionId: data.sessionId,
        requestId: data.requestId,
      }));
  }
}
