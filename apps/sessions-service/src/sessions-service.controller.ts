import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { CurrentUser, JwtAuthGuard, LocationCreationFailedEvent, LocationCreationSuccessEvent, LocationUpdateFailedEvent, LocationUpdateSuccessEvent, type UserTokenPayload, UserDeletedEvent } from '@app/common';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { SessionStatus } from './types/sessions-status.type';
import { GetSessionQueryDto } from './dto/get-session-query.dto';

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
    @Get()
    async getSessions(@Query() query : GetSessionQueryDto)
    {
      return this.sessionsService.getSessions(query);
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

    @EventPattern(KAFKA_TOPICS.LOCATION_CREATED_SUCCESS)
    async handleLocationCreated(@Payload() event: LocationCreationSuccessEvent)
    {
      return this.sessionsService.updateSessionSessionStatus(event.sessionId,SessionStatus.UPCOMING);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_CREATION_FAILED)
    async handleLocationDeleted(@Payload() event: LocationCreationFailedEvent)
    {
      return this.sessionsService.updateSessionSessionStatus(event.sessionId,SessionStatus.FAILED);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_UPDATE_SUCCESS)
    async handleLocationUpdated(@Payload() event: LocationUpdateSuccessEvent)
    {
      return this.sessionsService.updateSessionSessionStatus(event.sessionId,SessionStatus.UPCOMING);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_UPDATE_FAILED)
    async handleLocationUpdateFailed(@Payload() event: LocationUpdateFailedEvent)
    {
      return this.sessionsService.updateSessionSessionStatus(event.sessionId,SessionStatus.FAILED);
    }

    @EventPattern(KAFKA_TOPICS.USER_DELETED)
    async handleUserDeleted(@Payload() event: UserDeletedEvent)
    {
      return this.sessionsService.handleUserDeleted(event.userId);
    }

    //endpoint to verify database replication
    @Get('test/replication')
    async testReplication()
    {
      return this.sessionsService.testReplicationFollowing();
    }
  
}