import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, ParseUUIDPipe, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/common/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/auth/decorators/current-user.decorator';
import { type UserTokenPayload, UserRegisteredEvent, UserImageUpdatedEvent, UserEmailUpdatedEvent, UserDeletedEvent, EmailConfirmedGuard } from '@app/common';
import { UsersService } from './services/users-service.service';
import { FollowService } from './services/follow-serivice.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { LocationRepo } from './repos/location.repo';
import { UpdateLocationDto } from './dtos/update-location.dto';
import { SessionCreatedEvent } from '@app/common/events/session.created';


@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followService: FollowService,
  ) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async createUser(@Payload() event: UserRegisteredEvent) {
    await this.usersService.createUser(event.profile, event.photo);
  }
    

  @UseGuards(JwtAuthGuard, LongThrottleGuard)
  @Get('me')
  async getMe(@CurrentUser() user : UserTokenPayload)
  {
    return this.usersService.getMe(user.userId);
  }

  @Get(':userId')
  @UseGuards(LongThrottleGuard)
  async getUser(@Param('userId',ParseUUIDPipe) userId: string) {
    return this.usersService.getUserById(userId, ['email']);
  }



  @UseGuards(JwtAuthGuard,MediumThrottleGuard)
  @Put('me')
  @UseInterceptors(FileInterceptor('file'))
  async updateUser(@CurrentUser() user:UserTokenPayload, @Body() updateUserDto:UpdateUserDto, @UploadedFile() file?: Express.Multer.File)
  {
    if(!Object.keys(updateUserDto).length && !file) throw new BadRequestException('No data provided for update');
    return this.usersService.updateUser(user.userId, updateUserDto, file);
  }


  @EventPattern(KAFKA_TOPICS.USER_EMAIL_UPDATED)
  async handleUserEmailUpdated(@Payload() event: UserEmailUpdatedEvent) 
  {
    return this.usersService.updateUserEmail(event.userId, event.email);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeleted(@Payload() event: UserDeletedEvent) 
  {
    return  this.usersService.deleteUser(event.userId);  
  }

  @UseGuards(JwtAuthGuard, EmailConfirmedGuard,MediumThrottleGuard)
  @Post('follow/:followedId')
  async followUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.followUser(follower.id, followed.id);
  }

  @UseGuards(JwtAuthGuard,EmailConfirmedGuard ,MediumThrottleGuard)
  @Delete('unfollow/:followedId')
  async unfollowUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.unfollowUser(follower.id, followed.id);
  }

  @UseGuards(JwtAuthGuard,EmailConfirmedGuard ,MediumThrottleGuard)
  @Patch('location')
  async updateLocation(@CurrentUser() user:UserTokenPayload, @Body() updateLocationDto:UpdateLocationDto)
  {
    return this.usersService.updateUserLocation(user.userId, updateLocationDto);
  }

  @UseGuards(JwtAuthGuard,EmailConfirmedGuard ,MediumThrottleGuard)
  @Delete('location')
  async deleteLocation(@CurrentUser() user:UserTokenPayload)
  {
    return this.usersService.deleteUserLocation(user.userId);
  }


  // @EventPattern(KAFKA_TOPICS.SESSION_CREATED)
  // async handleSessionCreated(@Payload() event: SessionCreatedEvent) 
  // {
  //   return this.usersService.handleSessionCreated(event);
  // }

  @Post('event/test/session')
  async handleSessionCreated(@Body() event: SessionCreatedEvent)
  {
    console.log('Received event:', event);
    return this.usersService.handleSessionCreated(event);
  }
}
