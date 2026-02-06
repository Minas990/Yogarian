import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { JwtAuthGuard } from '@app/common/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@app/common/auth/decorators/current-user.decorator';
import { PhotoMetadataDto, UpdateUserDto,type UserTokenPayload } from '@app/common';
import { UsersService } from './services/users-service.service';
import { NewUserDto } from './dto/new-user.dto';
import { FollowService } from './services/follow-serivice.service';

@Controller('user')
export class UserController {
  constructor(private readonly usersService: UsersService,
    private readonly followService: FollowService
  ) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async createUser(@Payload() newUser: NewUserDto) {
    await this.usersService.createUser(newUser.createUserDto, newUser.photo);
  }
    
  @Get(':userId')
  async getUser(@Param('userId',ParseUUIDPipe) userId: string) {
    return this.usersService.getUserById(userId);
  }


  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user : UserTokenPayload)
  {
    return this.usersService.getUserById(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateUser(@CurrentUser() user:UserTokenPayload,@Body() updateUserDto:UpdateUserDto  )
  {
    if(updateUserDto.email)
      throw new BadRequestException('Email cannot be updated through this endpoint');
    return this.usersService.updateUser(user.userId,updateUserDto);
  }


  @EventPattern(KAFKA_TOPICS.USER_IMAGE_UPDATED)
  async handleUserImageUpdated(@Payload() payload: PhotoMetadataDto&{userId:string}) 
  {
    return this.usersService.updateUser(payload.userId, {photo: payload});
  }

  @EventPattern(KAFKA_TOPICS.USER_EMAIL_UPDATED)
  async handleUserEmailUpdated(@Payload() payload: { userId: string; email: string }) 
  {
    return this.usersService.updateUser(payload.userId, {email: payload.email});
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeleted(@Payload() payload: { userId: string }) 
  {
    return  this.usersService.deleteUser(payload.userId);  
  }

  @UseGuards(JwtAuthGuard)
  @Post('follow/:followedId')
  async followUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.followUser(follower.id, followed.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('unfollow/:followedId')
  async unfollowUser(@CurrentUser() user:UserTokenPayload,@Param('followedId',ParseUUIDPipe) followedId:string)
  {
    const follower = await this.usersService.getUserById(user.userId);
    const followed = await this.usersService.getUserById(followedId);
    return this.followService.unfollowUser(follower.id, followed.id);
  }
}
