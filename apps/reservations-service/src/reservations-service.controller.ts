import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { HttpOnlyJwtAuthGuard } from '@app/common/auth/guards/http-only-jwt-auth.guard';
import { SensitiveThrottleGuard } from 'apps/auth-service/src/guards/rate-limit.guard';
import { CurrentUser, RefundConfirmedEvent, RefundFailedEvent, SessionDeletedEvent, type UserTokenPayload } from '@app/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { ReservationStatus } from '@app/common/types/reservation-status.type';
import { CheckSessionUpcomingForRefundResponse, CheckSessionsAvailableResponse } from '@app/common/commands/sessions,command';
import { CreatePaymentCheckoutResponse, RefundReservationResponse } from '@app/common/commands/payment.command';
import { PaymentConfirmedEvent, PaymentFailedEvent } from '@app/common/events/payment.event';
import { ReservationsService } from './reservations.service';


@Controller('reservations')
@UseGuards(HttpOnlyJwtAuthGuard)
export class ReservationsServiceController
{
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post('book/:sessionId')
  @UseGuards(SensitiveThrottleGuard)
  async book(@CurrentUser() user : UserTokenPayload,@Param('sessionId',ParseUUIDPipe) sessionId: string)
  {
    return this.reservationsService.book(user.userId,sessionId);
  }

  @Get('session/:sessionId')
  async getSessionReservations(@CurrentUser() user : UserTokenPayload,@Param('sessionId',ParseUUIDPipe) sessionId: string)
  {
    return this.reservationsService.getReservation(user.userId,sessionId);
  }

  @Get(':requestId')
  async getReservationStatus(@CurrentUser() user : UserTokenPayload,@Param('requestId',ParseUUIDPipe) requestId: string)
  {
    return this.reservationsService.getReservationStatus(user.userId,requestId);
  }

  @Delete(':requestId')
  async cancelReservation(@CurrentUser() user : UserTokenPayload,@Param('requestId',ParseUUIDPipe) requestId: string)
  {
    return this.reservationsService.cancelReservation(user.userId,requestId);
  }

  @Delete('book/:sessionId')//for refund 
  async refundReservation(@CurrentUser() user : UserTokenPayload,@Param('sessionId',ParseUUIDPipe) sessionId: string)
  {
    return this.reservationsService.refundReservation(user.userId,sessionId);  
  }
  
  //getting all reservations made by a user will be from search service 
  //also for a trainer to see  how many reservations they have for a session will be from search service, so no need to implement those here


  @EventPattern(KAFKA_TOPICS.CHECK_SESSIONS_AVAILABLE_RESPONSE)
  async handleCheckSessionsAvailableResponse(@Payload() data: CheckSessionsAvailableResponse)
  {
    return this.reservationsService.handleCheckSessionsAvailableResponse(data);
  }

  @EventPattern(KAFKA_TOPICS.CREATE_PAYMENT_CHECKOUT_RESPONSE)
  async handleCreatePaymentCheckoutResponse(@Payload() data: CreatePaymentCheckoutResponse)
  {
    return this.reservationsService.handleCreatePaymentCheckoutResponse(data);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_CONFIRMED)
  async handlePaymentConfirmed(@Payload() data:PaymentConfirmedEvent)
  {
    return this.reservationsService.handlePaymentConfirmed(data);
  }

  @EventPattern(KAFKA_TOPICS.PAYMENT_FAILED)
  async handlePaymentFailed(@Payload() data: PaymentFailedEvent)
  {
    return this.reservationsService.handlePaymentFailed(data);
  }

  @EventPattern(KAFKA_TOPICS.REFUND_RESERVATION_RESPONSE)
  async handleRefundReservationResponse(@Payload() data: RefundReservationResponse)
  {
    return this.reservationsService.handleRefundReservationResponse(data);
  }

  @EventPattern(KAFKA_TOPICS.CHECK_SESSION_UPCOMING_FOR_REFUND_RESPONSE)
  async handleCheckSessionUpcomingForRefundResponse(@Payload() data: CheckSessionUpcomingForRefundResponse)
  {
    return this.reservationsService.handleCheckSessionUpcomingForRefundResponse(data);
  }

  @EventPattern(KAFKA_TOPICS.REFUND_RESERVATION_CONFIRMED)
  async handleRefundReservationConfirmed(@Payload() data: RefundConfirmedEvent)
  {
    return this.reservationsService.handleRefundReservationConfirmed(data);
  }

  @EventPattern(KAFKA_TOPICS.REFUND_RESERVATION_FAILED)
  async handleRefundReservationFailed(@Payload() data: RefundFailedEvent)
  {
    return this.reservationsService.handleRefundReservationFailed(data);
  }

  @EventPattern(KAFKA_TOPICS.REFUND_ALL_USERS) //refund all reservations for this session iff it's upcoming
  async handleSessionDeleted(@Payload() data: SessionDeletedEvent)
  {
    return this.reservationsService.handleSessionDeleted(data.sessionId); 
  }
}
