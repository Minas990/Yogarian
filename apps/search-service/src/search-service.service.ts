import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './models/User.entity';
import { Repository } from 'typeorm';
import { Session } from './models/session.model';
import { Reservation } from './models/reservations.model';
import { AppLoggerService, Geometry, SessionCreatedEvent, SessionDeletedEvent, SessionImagesCreationApprovedEvent, SessionImagesDeletionApprovedEvent, SessionUpdatedEvent, UserDeletedEvent, UserEmailUpdatedEvent, UserRegisteredEvent } from '@app/common';
import { UserProfileUpdatedEvent } from '@app/common/events/user-profile-updated.event';
import { UserFollowEvent } from '@app/common/events/user-follow.event';
import { Follow } from './models/follow.model';
import { UserImageProfile } from '@app/common/events/user-image';
import { DeleteLocationUserEvent, LocationUserEvent, UpdateLocationUserEvent } from '@app/common/events/location-user.event';
import { Photo } from './models/photos.model';

@Injectable()
export class SearchServiceService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo:Repository<User>,
    @InjectRepository(Follow) private readonly followRepo:Repository<Follow>,
    @InjectRepository(Session) private readonly sessionRepo:Repository<Session>,  
    @InjectRepository(Reservation) private readonly reservationRepo:Repository<Reservation>,
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    private readonly appLogger: AppLoggerService,
  )
    {

    }

    onModuleInit() {
      
    }
  async handleUserRegistered(data: UserRegisteredEvent)
  {
    const user = this.userRepo.create({
      userId: data.userId,
      email: data.email,
      name: data.name,
      phoneNumber:data.phoneNumber,
      createdAt: data.createdAt,
      role: data.role,
    });
    await this.userRepo.save(user);
    this.appLogger.logInfo({
      functionName: 'handleUserRegistered',
      message: `User with userId: ${data.userId} indexed in search service successfully`,
    });
    return "User indexed successfully in search service";
  }

  async handleUserDeleted(data: UserDeletedEvent)
  {
    await this.userRepo.delete({userId: data.userId});
    this.appLogger.logInfo({
      functionName: 'handleUserDeleted',
      message: `User with userId: ${data.userId} deleted from search service successfully`,
    });
    return "User deleted successfully from search service";
  }

  async handleUserEmailUpdated(data: UserEmailUpdatedEvent)
  {
    await this.userRepo.update({userId: data.userId},{email: data.email});
    this.appLogger.logInfo({
      functionName: 'handleUserEmailUpdated',
      message: `User with userId: ${data.userId} email updated in search service successfully`,
    });
    return "User email updated successfully in search service";
  }

  async handleUserProfileUpdated(data: UserProfileUpdatedEvent)
  {
    await this.userRepo.update({userId:data.userId},{name: data.name, phoneNumber: data.phoneNumber});
    this.appLogger.logInfo({
      functionName: 'handleUserProfileUpdated',
      message: `User with userId: ${data.userId} profile updated in search service successfully`,
    });
  }

  async handleUserFollowEvent(data: UserFollowEvent)
  {
    const follow = this.followRepo.create({
      followerId: data.followerId,
      followingId: data.followingId,
      createdAt: data.createdAt,
    });
    await this.followRepo.save(follow);
    this.appLogger.logInfo({
      functionName: 'handleUserFollowEvent',
      message: `User with userId: ${data.followerId} followed user with userId: ${data.followingId} indexed in search service successfully`,
    });
     return "User follow event indexed successfully in search service";
  }

  async handleUserUnfollowEvent(data: UserFollowEvent)
  {
    await this.followRepo.delete({followerId: data.followerId, followingId: data.followingId});
    this.appLogger.logInfo({
      functionName: 'handleUserUnfollowEvent',
      message: `User with userId: ${data.followerId} unfollowed user with userId: ${data.followingId} deleted from search service successfully`,
    });
     return "User unfollow event deleted successfully from search service";
  }

  async handleImageUserProfileCreated(data: UserImageProfile)
  {
    return this.userRepo.update({userId: data.userId},{profilePictureUrl: data.url});
  }

  async handleImageUserProfileUpdated(data: UserImageProfile)
  {
    return this.userRepo.update({userId: data.userId},{profilePictureUrl: data.url});
  }
  
  async handleImageUserProfileDeleted(data: UserImageProfile)
  {
    return this.userRepo.update({userId: data.userId},{profilePictureUrl: undefined});
  }

  async handleLocationUserCreated(data: LocationUserEvent)
  {
    const user = await this.userRepo.findOne({where:{userId: data.userId}});
    if(!user)
    {
      this.appLogger.logError({
        functionName: 'handleLocationUserCreated',
        problem: `User with userId: ${data.userId} not found in search service while handling location user created event`,
        error: new Error('User not found')
      });
      return;
    }
    user.address = data.address;
    user.governorate = data.governorate;
    user.latitude = data.latitude;
    user.longitude = data.longitude;
    const point : Geometry = {
      type: 'Point',
      coordinates: [data.longitude, data.latitude]
    }
    user.point = point;
    await this.userRepo.save(user);
    this.appLogger.logInfo({
      functionName: 'handleLocationUserCreated',
      message: `Location for user with userId: ${data.userId} indexed in search service successfully`,
    });
  }

  async handleLocationUserUpdated(data: UpdateLocationUserEvent)
  {
    const user = await this.userRepo.findOne({where:{userId: data.userId}});
    if(!user)
    {
      this.appLogger.logError({
        functionName: 'handleLocationUserUpdated',
        problem: `User with userId: ${data.userId} not found in search service while handling location user updated event`,
        error: new Error('User not found')
      });
      return;
    }
    if(data.address) user.address = data.address;
    if(data.governorate) user.governorate = data.governorate;
    if(data.latitude && data.longitude)
    {
      const point : Geometry = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      }
      user.point = point;
    }
    await this.userRepo.save(user);
  }

  async handleLocationUserDeleted(data: DeleteLocationUserEvent)
  {
    const user = await this.userRepo.findOne({where:{userId: data.userId}});
    if(!user)
    {
      this.appLogger.logError({
        functionName: 'handleLocationUserDeleted',
        problem: `User with userId: ${data.userId} not found in search service while handling location user deleted event`,
        error: new Error('User not found')
      });
      return;
    }
    await this.userRepo.update({userId: data.userId},{
      address: undefined,
      governorate: undefined,
      latitude: undefined,
      longitude: undefined,
      point: undefined
    });
  }
  
  async handleSessionCreated(data: SessionCreatedEvent)
  {
    const point : Geometry = {
      type: 'Point',
      coordinates: [data.longitude, data.latitude]
    }
    await this.sessionRepo.save({
      ...data,
      currentParticipants: 0,
      point: point,
    });
    this.appLogger.logInfo({
      functionName: 'handleSessionCreated',
      message: `Session with sessionId: ${data.sessionId} indexed in search service successfully`,
    });
     return "Session indexed successfully in search service";
  }

  async handleSessionUpdated(data: SessionUpdatedEvent)
  {
    let point : Geometry | undefined = undefined;
    if(data.latitude && data.longitude)
    {
      point = {
        type: 'Point',
        coordinates: [data.longitude, data.latitude]
      }
    }
    await this.sessionRepo.update({sessionId: data.sessionId}, {...data, point});
  }

  async handleSessionDeleted(data: SessionDeletedEvent)
  {
    await this.sessionRepo.delete({sessionId: data.sessionId});
  }

  async handleSessionImagesCreationApproved(data: SessionImagesCreationApprovedEvent)
  {
    const session = await this.sessionRepo.findOne({where:{sessionId: data.sessionId}, relations:['photos']});
    if(!session)    
    {
      this.appLogger.logError({
        functionName: 'handleSessionImagesCreationApproved',
        problem: `Session with sessionId: ${data.sessionId} not found in search service while handling session images creation approved event`,
        error: new Error('Session not found')
      });
      return;
    }
    const newPhotos = data.photoIds.map((photoId, index) => {
      const photo = new Photo();
      photo.id = photoId;
      photo.url = data.urls[index];
      photo.session = session;
      photo.sessionId = session.sessionId;
      return photo;
    });
    session.photos = [...(session.photos || []), ...newPhotos];
    await this.sessionRepo.save(session);
  }

  async handleSessionImagesDeletionApproved(data: SessionImagesDeletionApprovedEvent)
  {
    const session = await this.sessionRepo.findOne({where:{sessionId: data.sessionId}, relations:['photos']});
    if(!session)    
    {
      this.appLogger.logError({
        functionName: 'handleSessionImagesDeletionApproved',
        problem: `Session with sessionId: ${data.sessionId} not found in search service while handling session images deletion approved event`,
        error: new Error('Session not found')
      });
      return;
    }
    session.photos = session.photos?.filter(photo => !data.photoIds.includes(photo.id));
    await this.sessionRepo.save(session);
  }
}
