import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, ParseUUIDPipe, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { FileInterceptor } from '@nestjs/platform-express';
import { KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/common/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/auth/decorators/current-user.decorator';
import { type UserTokenPayload, UserRegisteredEvent, UserImageUpdatedEvent, UserEmailUpdatedEvent, UserDeletedEvent } from '@app/common';
import { UsersService } from './services/users-service.service';
import { FollowService } from './services/follow-serivice.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';


@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followService: FollowService
  ) {}
  private logger = new Logger(UserController.name);

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async createUser(@Payload() event: UserRegisteredEvent) {
    this.logger.log(`${KAFKA_TOPICS.USER_REGISTERED} event received for userId: ${event.profile.userId}, DATA : ${JSON.stringify(event)}`);
    await this.usersService.createUser(event.profile, event.photo);
  }
    

  @UseGuards(JwtAuthGuard, LongThrottleGuard)
  @Get('me')
  async getMe(@CurrentUser() user : UserTokenPayload)
  {
    return this.usersService.getUserById(user.userId);
  }

  @Get(':userId')
  @UseGuards(LongThrottleGuard)
  async getUser(@Param('userId',ParseUUIDPipe) userId: string) {
    return this.usersService.getUserById(userId);
  }



  @UseGuards(JwtAuthGuard,MediumThrottleGuard)
  @Put('me')
  @UseInterceptors(FileInterceptor('file'))
  async updateUser(@CurrentUser() user:UserTokenPayload, @Body() updateUserDto:UpdateUserDto, @UploadedFile() file?: Express.Multer.File)
  {
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

  @UseGuards(JwtAuthGuard, MediumThrottleGuard)
  @Post('follow/:followedId')
  async followUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.followUser(follower.id, followed.id);
  }

  @UseGuards(JwtAuthGuard, MediumThrottleGuard)
  @Delete('unfollow/:followedId')
  async unfollowUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.unfollowUser(follower.id, followed.id);
  }
}
