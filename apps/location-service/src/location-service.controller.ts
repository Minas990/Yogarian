import { CurrentUser, EmailConfirmedGuard, UserDeletedEvent, type UserTokenPayload } from '@app/common';
import { HttpOnlyJwtAuthGuard } from '@app/common/auth/guards/http-only-jwt-auth.guard';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NearestSessionsQueryDto } from './dto/nearest-sessions-query.dto';
import { EventPattern } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { LocationService } from './location-service.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';


@UseGuards(HttpOnlyJwtAuthGuard)
@Controller('location')
export class LocationServiceController {
  constructor( private readonly locationService: LocationService) {}

  @UseGuards(LongThrottleGuard,EmailConfirmedGuard)
  @Get('user')
  async getCurrentLocation(@CurrentUser() user : UserTokenPayload)
  {
    return this.locationService.getUserLocation(user.userId);
  }

  @UseGuards(MediumThrottleGuard,EmailConfirmedGuard)
  @Post('user')
  async createLocation(@CurrentUser() user : UserTokenPayload, @Body() dto: CreateLocationDto)
  {
    return this.locationService.createLocation(user.userId, dto);
  }

  @UseGuards(MediumThrottleGuard,EmailConfirmedGuard)
  @Patch('user')
  async updateLocation(@CurrentUser() user : UserTokenPayload, @Body() dto: UpdateLocationDto)
  {
    return this.locationService.updateLocation(user.userId, dto);
  }

  @UseGuards(MediumThrottleGuard,EmailConfirmedGuard)
  @Delete('user')
  async deleteLocation(@CurrentUser() user : UserTokenPayload)
  {
    await this.locationService.deleteLocation(user.userId);
    return { message: 'Location deleted successfully' };
  }

  @UseGuards(LongThrottleGuard,EmailConfirmedGuard)
  @Get('nearest/sessions')//we store the user location for another purpose not for finding it's nearest sessions 
  async getNearestSessions(@CurrentUser() user : UserTokenPayload,@Query() query: NearestSessionsQueryDto )
  {
    return this.locationService.getNearestSessions(
      query.latitude, 
      query.longitude, 
      query.radius, 
      query.limit,
      query.page
    );
  }

  @UseGuards(LongThrottleGuard,EmailConfirmedGuard)
  @Get('session/:sessionId')
  async getSessionLocation(@Param('sessionId',ParseUUIDPipe) sessionId: string)
  {
    return this.locationService.getSessionLocation(sessionId);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeleted(data: UserDeletedEvent)
  {
    await this.locationService.handleUserDeleted(data.userId);
  }

  @EventPattern(KAFKA_TOPICS.SESSION_CREATED)
  async handleSessionCreated(data: any) 
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_DELETED)
  async handleSessionDeleted(data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_UPDATED)
  async handleSessionUpdated(data: any)
  {

  }

  @Post('test')
  async test(@Body() body: any)
  {
    return this.locationService.test(body);
  }
}
