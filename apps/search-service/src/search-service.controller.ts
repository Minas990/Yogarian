import { Controller, Get } from '@nestjs/common';
import { SearchServiceService } from './search-service.service';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';

@Controller()
export class SearchServiceController {
  constructor(private readonly searchServiceService: SearchServiceService) {}

  @EventPattern(KAFKA_TOPICS.SESSION_CREATED)
  async handleSessionCreated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_UPDATED)
  async handleSessionUpdated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_DELETED)
  async handleSessionDeleted(@Payload() data: any)
  {

  }
  
  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async handleUserRegistered(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeleted(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_EMAIL_UPDATED)
  async handleUserEmailUpdated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_CREATED)
  async handleUserProfileCreated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_PROFILE_UPDATED)
  async handleUserProfileUpdated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_CREATED)
  async handleImageUserProfileCreated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_DELETED)
  async handleImageUserProfileDeleted(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.IMAGE_USER_PROFILE_UPDATED)
  async handleImageUserProfileUpdated(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_CREATION_APPROVED)
  async handleSessionImagesCreationApproved(@Payload() data: any)
  {

  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_DELETION_APPROVED)
  async handleSessionImagesDeletionApproved(@Payload() data: any)
  {

  }

}
