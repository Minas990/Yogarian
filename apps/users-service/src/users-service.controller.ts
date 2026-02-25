import { BadRequestException, Body, Controller, Delete, Get, Logger, Param, ParseUUIDPipe, Patch, Post, Put, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/common/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/auth/decorators/current-user.decorator';
import { type UserTokenPayload, UserRegisteredEvent, UserImageUpdatedEvent, UserEmailUpdatedEvent, UserDeletedEvent, EmailConfirmedGuard, SessionCreatedEvent, SessionCreatedLocationEvent, Roles, RolesDecorator } from '@app/common';
import { UsersService } from './services/users-service.service';
import { FollowService } from './services/follow-serivice.service';
import { UpdateUserDto } from './dtos/update-user.dto';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';
import { IsAllowedGuard } from '@app/common/auth/guards/is-allowed.guard';


@Controller('user')
export class UserController {
  constructor(
    private readonly usersService: UsersService,
    private readonly followService: FollowService,
  ) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async createUser(@Payload() event: UserRegisteredEvent) {
    await this.usersService.createUser(event);
  }
    
  @Get(':userId')//simple get endpoint , complex ones for search service
  @UseGuards(LongThrottleGuard)
  async getUser(@Param('userId',ParseUUIDPipe) userId: string) {
    return this.usersService.getUserById(userId, ['email']);
  }


  @UseGuards(JwtAuthGuard,MediumThrottleGuard)
  @Put('me')
  async updateUser(@CurrentUser() user:UserTokenPayload, @Body() updateUserDto:UpdateUserDto)
  {
    if(!Object.keys(updateUserDto).length) throw new BadRequestException('No data provided for update');
    return this.usersService.updateUser(user.userId, updateUserDto);
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


  //its not worth validate the role of the follwed user
  //if a user follow a user not a trainer good for him, nothing critical will happen 

  @RolesDecorator(Roles.USER)
  @UseGuards(JwtAuthGuard, EmailConfirmedGuard,MediumThrottleGuard,IsAllowedGuard)
  @Post('follow/:followedId')
  async followUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    if(follower.userId === followed.userId) throw new BadRequestException('You cannot follow yourself');
    return this.followService.followUser(follower.userId, followed.userId);
  }

  //its not worth validate the role 
  //if a user follow a user not a trainer good for him, 
  @RolesDecorator(Roles.USER)
  @UseGuards(JwtAuthGuard,EmailConfirmedGuard ,MediumThrottleGuard,IsAllowedGuard)
  @Delete('unfollow/:followedId')
  async unfollowUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    if(follower.userId === followed.userId) throw new BadRequestException('You cannot unfollow yourself');
    return this.followService.unfollowUser(follower.userId, followed.userId);
  }
}
