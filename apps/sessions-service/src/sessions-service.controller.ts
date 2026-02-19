import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { SessionsService } from './services/sessions.service';
import { CurrentUser, JwtAuthGuard,type UserTokenPayload } from '@app/common';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { EventPattern } from '@nestjs/microservices';
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
    async handleLocationCreated(data:{sessionId:string})
    {
      return this.sessionsService.updateSessionSessionStatus(data.sessionId,SessionStatus.ONGOING);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_CREATION_FAILED)
    async handleLocationDeleted(data:{sessionId:string})
    {
      return this.sessionsService.updateSessionSessionStatus(data.sessionId,SessionStatus.FAILED);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_UPDATE_SUCCESS)
    async handleLocationUpdated(data:{sessionId:string})
    {
      return this.sessionsService.updateSessionSessionStatus(data.sessionId,SessionStatus.ONGOING);
    }

    @EventPattern(KAFKA_TOPICS.LOCATION_UPDATE_FAILED)
    async handleLocationUpdateFailed(data:{sessionId:string})
    {
      return this.sessionsService.updateSessionSessionStatus(data.sessionId,SessionStatus.FAILED);
    }

    //endpoint to verify database replication
    @Get('test/replication')
    async testReplication()
    {
      return this.sessionsService.testReplicationFollowing();
    }
  
}