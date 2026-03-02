import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { CurrentUser, JwtAuthGuard,  type UserTokenPayload, UserDeletedEvent, ImagesSessionCreatedEvent, ImagesSessionDeletedEvent, ReservationCancelledEvent, RefundConfirmedEvent } from '@app/common';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { CheckSessionUpcomingForRefundCommand, CheckSessionsAvailableCommand } from '@app/common/commands/sessions,command';

@Controller('sessions')
export class SessionsServiceController {
  constructor(
    private readonly sessionsService: SessionsService,
    ) {}

    @UseGuards(JwtAuthGuard,MediumThrottleGuard)
    @Post()
    async createSession(@CurrentUser() user : UserTokenPayload,@Body() createSessionDto:CreateSessionDto)
    {
      return this.sessionsService.create(user.userId,createSessionDto);
    }
  
    @UseGuards(LongThrottleGuard)
    @Get(':id')
    async getSessionById(@Param('id',ParseUUIDPipe) id: string)
    {
      return this.sessionsService.getSessionById(id);   
    }

    @UseGuards(JwtAuthGuard,MediumThrottleGuard)
    @Patch(':id')
    async updateSession(@CurrentUser() user : UserTokenPayload,@Param('id',ParseUUIDPipe) id: string,@Body() body:UpdateSessionDto)
    {
      return this.sessionsService.updateSession(user.userId,id,body);
    }

    @UseGuards(JwtAuthGuard,MediumThrottleGuard)
    @Delete(':id')
    async deleteSession(@CurrentUser() user : UserTokenPayload,@Param('id',ParseUUIDPipe) id: string)
    {
      return this.sessionsService.deleteSession(user.userId,id);
    }


    @EventPattern(KAFKA_TOPICS.USER_DELETED)
    async handleUserDeleted(@Payload() event: UserDeletedEvent)
    {
      return this.sessionsService.handleUserDeleted(event.userId);
    }

    @EventPattern(KAFKA_TOPICS.IMAGES_SESSION_CREATED)
    async handleSessionImagesCreated(@Payload() event: ImagesSessionCreatedEvent)
    {
      this.sessionsService.handleImagesCreated(event.userId,event.sessionId,event.photoIds,event.urls);
    }

    @EventPattern(KAFKA_TOPICS.IMAGES_SESSION_DELETED)
    async handleSessionImagesDeleted(@Payload() event: ImagesSessionDeletedEvent)
    {
      return this.sessionsService.handleSessionImagesDeleted(event.userId,event.sessionId,event.photoIds);
    }

    @EventPattern(KAFKA_TOPICS.CHECK_SESSIONS_AVAILABLE_COMMAND)
    async handleCheckSessionsAvailable(@Payload() data: CheckSessionsAvailableCommand)
    {
      return this.sessionsService.handleCheckSessionsAvailable(data.sessionId,data.requestId);
    }

    @EventPattern(KAFKA_TOPICS.RESERVATION_CANCELLED)
    async handleReservationCancelled(@Payload() data: ReservationCancelledEvent)
    {
      return this.sessionsService.handleReservationCancelled(data.sessionId);
    }

    @EventPattern(KAFKA_TOPICS.REFUND_RESERVATION_CONFIRMED)
    async handleRefundReservationConfirmed(@Payload() data: RefundConfirmedEvent)
    {
      return this.sessionsService.handleRefundReservationConfirmed(data.sessionId);
    }

    @EventPattern(KAFKA_TOPICS.CHECK_SESSION_UPCOMING_FOR_REFUND_COMMAND)
    async handleCheckSessionUpcomingForRefund(@Payload() data: CheckSessionUpcomingForRefundCommand)
    {
      return this.sessionsService.handleCheckSessionUpcomingForRefund(data.sessionId, data.requestId);
    }
}