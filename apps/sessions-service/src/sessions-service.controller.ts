import { EmailConfirmedGuard, JwtAuthGuard, Roles, RolesDecorator, CurrentUser } from '@app/common';
import { IsAllowedGuard } from '@app/common/auth/guards/is-allowed.guard';
import { KAFKA_TOPICS } from '@app/kafka';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { SessionsService } from './services/sessions.service';
import { ReviewsService } from './services/reviews.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { LocationDto } from './dto/location.dto';
import { GetSessionsQuery } from './types/get-sessions.type';
import { GetReviewsQuery } from './types/get-reviews.type';
import { FilesInterceptor } from '@nestjs/platform-express';

@Controller('sessions')
export class SessionsServiceController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get()
  async getQuery(@Query() query: GetSessionsQuery) {
    return this.sessionsService.findAll(query);
  }

  @Get('nearest')
  async getNearestSessions(@Query() locationDto: LocationDto) {
    return this.sessionsService.findNearestSessions(
      locationDto.latitude,
      locationDto.longitude,
      locationDto.radiusKm || 10,
      locationDto.page || 1,
      locationDto.limit || 10,
    );
  }

  @Get('trainer/:userId')
  async getSessionsByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetSessionsQuery,
  ) {
    return this.sessionsService.findByTrainerId(userId, query.page, query.limit);
  }

  @Get(':id')
  async getSessionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.sessionsService.findById(id);
  }

  @Get(':id/reviews')
  async getReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetReviewsQuery,
  ) {
    return this.reviewsService.findBySessionId(id, query);
  }

  @RolesDecorator(Roles.TRAINER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @UseInterceptors(FilesInterceptor('images',3))
  @Post()
  async createSession(@Body() createSessionDto: CreateSessionDto, @CurrentUser() user: any,) {
    return this.sessionsService.create(createSessionDto, user.userId);
  }

  @RolesDecorator(Roles.TRAINER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @Patch(':id')
  async updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSessionDto: UpdateSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.sessionsService.update(id, updateSessionDto, user.userId);
  }

  @RolesDecorator(Roles.TRAINER, Roles.ADMIN)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @Delete(':id')
  async deleteSession(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: any) {
    return this.sessionsService.delete(id, user.userId);
  }

  @RolesDecorator(Roles.USER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @Post(':id/review')
  async submitReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() reviewDto: CreateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.create(id, reviewDto, user.userId);
  }

  @RolesDecorator(Roles.USER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @Delete(':id/review/:reviewId')
  async deleteReview(@Param('reviewId', ParseUUIDPipe) reviewId: string, @CurrentUser() user: any) {
    return this.reviewsService.delete(reviewId, user.userId);
  }

  @RolesDecorator(Roles.USER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, IsAllowedGuard)
  @Patch(':id/review/:reviewId')
  async updateReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() reviewDto: UpdateReviewDto,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.update(reviewId, reviewDto, user.userId);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeletedEvent(payload: any) {
    console.log(`User deleted event received for userId: ${payload.userId}`);
  }
}
