import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { SearchServiceService } from './search-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { CurrentUser, JwtAuthGuard, Roles, SessionCreatedEvent, SessionDeletedEvent, SessionImagesCreationApprovedEvent, SessionImagesDeletionApprovedEvent, SessionUpdatedEvent, UserDeletedEvent, UserEmailUpdatedEvent, UserRegisteredEvent,type UserTokenPayload } from '@app/common';
import { UserProfileUpdatedEvent } from '@app/common/events/user-profile-updated.event';
import { UserFollowEvent } from '@app/common/events/user-follow.event';
import { UserImageProfile } from '@app/common/events/user-image';
import { DeleteLocationUserEvent, LocationUserEvent, UpdateLocationUserEvent } from '@app/common/events/location-user.event';
import { FindSessionsDto } from './types/find-sessions.type';
import { LongThrottleGuard, MediumThrottleGuard } from './guards/rate-limit.guard';

@Controller('search')
export class SearchServiceController {
  constructor(private readonly searchServiceService: SearchServiceService) {}

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: UserRegisteredEvent)
  {
    return this.searchServiceService.handleUserRegistered(data);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeleted(@Payload() data: UserDeletedEvent)
  {
    return this.searchServiceService.handleUserDeleted(data);
  }

  @EventPattern(KAFKA_TOPICS.USER_EMAIL_UPDATED)
  async handleUserEmailUpdated(@Payload() data: UserEmailUpdatedEvent)
  {
    return this.searchServiceService.handleUserEmailUpdated(data);
  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_UPDATED)
  async handleUserProfileUpdated(@Payload() data: UserProfileUpdatedEvent)
  {
    return this.searchServiceService.handleUserProfileUpdated(data);
  }

  @EventPattern(KAFKA_TOPICS.USER_FOLLOW_EVENT)
  async handleUserFollowEvent(@Payload() data: UserFollowEvent)
  {
    return this.searchServiceService.handleUserFollowEvent(data);
  }

  @EventPattern(KAFKA_TOPICS.USER_UNFOLLOW_EVENT)
  async handleUserUnfollowEvent(@Payload() data: UserFollowEvent)
  {
    return this.searchServiceService.handleUserUnfollowEvent(data);
  }

  @EventPattern(KAFKA_TOPICS.LOCATION_USER_CREATED)
  async handleLocationUserCreated(@Payload() data: LocationUserEvent)
  {
    return this.searchServiceService.handleLocationUserCreated(data);
  }

  @EventPattern(KAFKA_TOPICS.LOCATION_USER_UPDATED)
  async handleLocationUserUpdated(@Payload() data: UpdateLocationUserEvent)
  {
    return this.searchServiceService.handleLocationUserUpdated(data);
  }

  @EventPattern(KAFKA_TOPICS.LOCATION_USER_DELETED)
  async handleLocationUserDeleted(@Payload() data: DeleteLocationUserEvent)
  {
    return this.searchServiceService.handleLocationUserDeleted(data);
  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_CREATED)
  async handleImageUserProfileCreated(@Payload() data: UserImageProfile)
  {
    return this.searchServiceService.handleImageUserProfileCreated(data);
  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_DELETED)
  async handleImageUserProfileDeleted(@Payload() data: UserImageProfile)
  {
    return this.searchServiceService.handleImageUserProfileDeleted(data);
  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_UPDATED)
  async handleImageUserProfileUpdated(@Payload() data: UserImageProfile)
  {
    return this.searchServiceService.handleImageUserProfileUpdated(data);
  }

  

  @EventPattern(KAFKA_TOPICS.SESSION_CREATED)
  async handleSessionCreated(@Payload() data: SessionCreatedEvent)
  {
    await this.searchServiceService.handleSessionCreated(data).catch((err) => console.log('Failed to create session in search service',err));
    
    try {
      
      const nearest = await this.searchServiceService.getNearestUsers(data.longitude,data.latitude);
      const followers = await this.searchServiceService.getFollowersEmail(data.userId); 
      const finalNearest = nearest.filter(near => !followers.includes(near)); 
      //complexity here are m*n but the array size is only 100  a better solution to use set but m*n is acceptable for this case and we want to avoid the overhead of creating a set and converting back to array
      await Promise.all([
        this.searchServiceService.notifyUsersForNewSession(data, finalNearest,`A new session has been created near you: ${data.title}`),
        this.searchServiceService.notifyUsersForNewSession(data, followers,`A trainer you follow created a new session: ${data.title}`)
      ]);
    } catch (error) {
      console.log('Error in handling session created event', error);
    }
  }

  @EventPattern(KAFKA_TOPICS.SESSION_UPDATED)
  async handleSessionUpdated(@Payload() data: SessionUpdatedEvent)
  {
    return this.searchServiceService.handleSessionUpdated(data).catch((err) => console.log('Failed to update session in search service',err));
  }

  @EventPattern(KAFKA_TOPICS.SESSION_DELETED)
  async handleSessionDeleted(@Payload() data: SessionDeletedEvent)
  {
    return this.searchServiceService.handleSessionDeleted(data);
  }
  

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_CREATION_APPROVED)
  async handleSessionImagesCreationApproved(@Payload() data: SessionImagesCreationApprovedEvent)
  {
    return this.searchServiceService.handleSessionImagesCreationApproved(data);
  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_DELETION_APPROVED)
  async handleSessionImagesDeletionApproved(@Payload() data: SessionImagesDeletionApprovedEvent)
  {
    return this.searchServiceService.handleSessionImagesDeletionApproved(data);
  }

  // @UseGuards(LongThrottleGuard)
  @Get('sessions')
  async getAllSessions(@Query() query:FindSessionsDto)
  {
    return this.searchServiceService.findSessions(query);
  }

  @UseGuards(LongThrottleGuard,JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user:UserTokenPayload)
  {
    return this.searchServiceService.getMe(user.userId);
  }

  @UseGuards(LongThrottleGuard,JwtAuthGuard)
  @Get('sessions/me')
  async getMySessions(@CurrentUser() user:UserTokenPayload,@Query('limit') limit:number,@Query('page') page:number) 
  {
    if(!limit ||  limit <=0 || page <0)
      throw new BadRequestException('Limit and page must be positive integers');
    if(user.role == Roles.TRAINER)//for a trainer we return all his sessions 
    {
      return this.searchServiceService.getMySessionsTrainer(user.userId,limit,page);
    }
    else //for a user we return only the sessions he participated in 
    {
      return this.searchServiceService.getMySessionsUser(user.userId,limit,page);
    }
  }

  @UseGuards(LongThrottleGuard,JwtAuthGuard)
  @Get('followers')
  async getMyFollowers(@CurrentUser() user:UserTokenPayload,@Query('limit') limit:number,@Query('page') page:number)
  {
    if(!limit ||  limit <=0 || page <0)
      throw new BadRequestException('Limit and page must be positive integers');
    return this.searchServiceService.getFollowers(user.userId,limit,page);
  }

  @UseGuards(LongThrottleGuard,JwtAuthGuard)
  @Get('following')//only user can see who he follows
  async getMyFollowing(@CurrentUser() user:UserTokenPayload,@Query('limit') limit:number,@Query('page') page:number)
  {
    if(!limit ||  limit <=0 || page <0)
      throw new BadRequestException('Limit and page must be positive integers');
    return this.searchServiceService.getFollowing(user.userId,limit,page);
  }

  @UseGuards(MediumThrottleGuard,JwtAuthGuard)
  @Get('follower/:id')//any user can see the followers of any trainer 
  async getUserFollowers(@Param('id',ParseUUIDPipe) id:string,@Query('limit') limit:number,@Query('page') page:number)
  {
    if(!limit ||  limit <=0 || page <0)
      throw new BadRequestException('Limit and page must be positive integers');
    return this.searchServiceService.getFollowers(id,limit,page);
  }


  @UseGuards(LongThrottleGuard,JwtAuthGuard)
  @Get('trainer/:id')
  async getUserById(@CurrentUser() user:UserTokenPayload,@Param('id',ParseUUIDPipe) id:string)
  {
    return this.searchServiceService.getTrainerById(id);
  }


}
