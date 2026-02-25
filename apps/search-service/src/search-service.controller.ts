import { Controller, Get } from '@nestjs/common';
import { SearchServiceService } from './search-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { SessionCreatedEvent, SessionDeletedEvent, SessionImagesCreationApprovedEvent, SessionImagesDeletionApprovedEvent, SessionUpdatedEvent, UserDeletedEvent, UserEmailUpdatedEvent, UserRegisteredEvent } from '@app/common';
import { UserProfileUpdatedEvent } from '@app/common/events/user-profile-updated.event';
import { UserFollowEvent } from '@app/common/events/user-follow.event';
import { UserImageProfile } from '@app/common/events/user-image';
import { DeleteLocationUserEvent, LocationUserEvent, UpdateLocationUserEvent } from '@app/common/events/location-user.event';

@Controller()
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
    return this.searchServiceService.handleSessionCreated(data);
  }

  @EventPattern(KAFKA_TOPICS.SESSION_UPDATED)
  async handleSessionUpdated(@Payload() data: SessionUpdatedEvent)
  {
    return this.searchServiceService.handleSessionUpdated(data);
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

}
