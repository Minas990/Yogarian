import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
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
import { FindSessionsDto } from './types/find-sessions.type';
import { SessionStatus } from '@app/common/types/sessions-status.type';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { SessionNotifyEvent } from '@app/common/events/session-notify.event';
import { randomBytes } from 'crypto';

@Injectable()
export class SearchServiceService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly userRepo:Repository<User>,
    @InjectRepository(Follow) private readonly followRepo:Repository<Follow>,
    @InjectRepository(Session) private readonly sessionRepo:Repository<Session>,  
    @InjectRepository(Reservation) private readonly reservationRepo:Repository<Reservation>,
    @InjectRepository(Photo) private readonly photoRepo: Repository<Photo>,
    private readonly appLogger: AppLoggerService,
    @Inject(KAFKA_SERVICE) private readonly kafka:ClientKafka
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
    await this.userRepo.increment({ userId: data.followingId }, 'followersCount', 1);
    await this.userRepo.increment({ userId: data.followerId }, 'followingCount', 1);
    this.appLogger.logInfo({
      functionName: 'handleUserFollowEvent',
      message: `User with userId: ${data.followerId} followed user with userId: ${data.followingId} indexed in search service successfully`,
    });
     return "User follow event indexed successfully in search service";
  }

  async handleUserUnfollowEvent(data: UserFollowEvent)
  {
    await this.followRepo.delete({followerId: data.followerId, followingId: data.followingId});
    await this.userRepo.decrement({ userId: data.followingId }, 'followersCount', 1);
    await this.userRepo.decrement({ userId: data.followerId }, 'followingCount', 1);
    
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
    return this.userRepo.update({userId: data.userId},{profilePictureUrl: null as any});
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
    user.latitude = data.latitude.toString();
    user.longitude = data.longitude.toString();
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
      longitude: data.longitude.toString(),
      latitude: data.latitude.toString(),
      currentParticipants: 0,
      point: point,
      status:SessionStatus.UPCOMING,
      sessionId:data.sessionId,
      userId:data.userId
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
    await this.sessionRepo.update({sessionId: data.sessionId}, {...data,longitude: data.longitude?.toString(), latitude: data.latitude?.toString(), point});
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

  async findSessions(query: FindSessionsDto) 
  {
    const qb = this.sessionRepo.createQueryBuilder('session');
    if(query.oldSessions)
        qb.where('session.status IN (:...statuses)', { statuses: [SessionStatus.UPCOMING, SessionStatus.COMPLETED] });
    else 
        qb.where('session.status = :status', { status: SessionStatus.UPCOMING }).andWhere('session.currentParticipants < session.maxParticipants');

    if (query.governorate)
        qb.andWhere('session.governorate = :governorate', { governorate: query.governorate });

    if (query.minDuration != null)
        qb.andWhere('session.duration >= :minDuration', { minDuration: query.minDuration });

    if (query.maxDuration != null)
        qb.andWhere('session.duration <= :maxDuration', { maxDuration: query.maxDuration });

    if (query.minPrice != null)
        qb.andWhere('session.price >= :minPrice', { minPrice: query.minPrice });

    if (query.maxPrice != null)
        qb.andWhere('session.price <= :maxPrice', { maxPrice: query.maxPrice });

    if (query.latitude != null && query.longitude != null && query.radius != null) {
        qb.andWhere(
            `ST_DWithin(
                session.point::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radius
            )`,
            { longitude: query.longitude, latitude: query.latitude, radius: query.radius }
        );
    }

    if (query.trainerId)
        qb.andWhere('session.userId = :trainerId', { trainerId: query.trainerId });

    if (query.minStartTime)
        qb.andWhere('session.startTime >= :minStartTime', { minStartTime: query.minStartTime });

    if (query.maxParticipants)
        qb.andWhere('session.maxParticipants <= :maxParticipants', { maxParticipants: query.maxParticipants });
    if (query.cursor) {
    const [cursorDate, cursorId] = query.cursor.split('__');
      qb.andWhere(
          '(session.createdAt > :cursorDate OR (session.createdAt = :cursorDate AND session.sessionId > :cursorId))',
          { cursorDate: new Date(cursorDate), cursorId }
      );
    }

    const limit = Math.min(query.limit ?? 20, 100);

    const sessions = await qb
        .orderBy('session.createdAt', 'ASC')
        .addOrderBy('session.sessionId', 'ASC')
        .take(limit + 1)
        .getMany();

    const hasNextPage = sessions.length > limit;
    if (hasNextPage) sessions.pop();

    const nextCursor = hasNextPage
        ? `${sessions[sessions.length - 1].createdAt.toISOString()}__${sessions[sessions.length - 1].sessionId}`
        : null;        
    return {
        data: sessions,
        nextCursor,
        limit,
        hasNextPage
    };
  }

  async getMe(userId: string)
  {
    const user = await this.userRepo.findOne({where:{userId}});
    return user;
  }

  async getMySessionsUser(userId: string, limit: number, page: number = 0) {
      const qb = this.reservationRepo
          .createQueryBuilder('reservation')
          .innerJoin('reservation.session', 'session')
          .where('reservation.userId = :userId', { userId })
          .select([
              'reservation.locked_price AS reservation_price',  
              'reservation.createdAt AS reservation_createdAt',
              'session.startTime AS session_startTime',
              'session.duration AS session_duration',
              'session.title AS session_title',
              'session.description AS session_description',
          ])
          .skip(page * limit)
          .take(limit);

      const [rows, total] = await Promise.all([
          qb.getRawMany(),
          qb.getCount(),
      ]);

      return {
          data: rows.map(r => ({
              price: r.reservation_price,
              reservedAt: r.reservation_createdAt,
              session: {
                  startTime: r.session_startTime,
                  duration: r.session_duration,
                  title: r.session_title,
                  description: r.session_description,
              }
          })),
          total,
          page,
          limit
      };
  }

  async getMySessionsTrainer(userId: string, limit: number, page: number = 0)
  {
    const qb = this.sessionRepo.createQueryBuilder('session');
    qb.where('session.userId = :userId', { userId });
    qb.skip(page * limit).take(limit);
    const [sessions, total] = await qb.getManyAndCount();
    return {
      data: sessions,
      total,
      page,
      limit
    };
  }

async getFollowers(userId: string, limit :number, page :number = 0) 
{
    const qb = this.followRepo
        .createQueryBuilder('follow')
        .innerJoin('follow.follower', 'follower')
        .where('follow.followingId = :userId', { userId })
        .select([
            'follower.userId AS userId',
            'follower.name AS name',
            'follower.profilePictureUrl AS profilePictureUrl',
        ])
        .skip(page * limit)
        .take(limit);

    const [rows, total] = await Promise.all([
        qb.getRawMany(),
        qb.getCount(),
    ]);

    return {
        data: rows,
        total,
        page,
        limit,
    };
  }

  async getFollowing(userId: string, limit:number, page :number = 0) //the people i follow 
  {
    const qb = this.followRepo
        .createQueryBuilder('follow')
        .innerJoin('follow.following', 'following')
        .where('follow.followerId = :userId', { userId })
        .select([
            'following.userId AS userId',
            'following.name AS name',
            'following.profilePictureUrl AS profilePictureUrl',
        ])
        .skip(page * limit)
        .take(limit);

    const [rows, total] = await Promise.all([
        qb.getRawMany(),
        qb.getCount(),
    ]);

    return {
        data: rows,
        total,
        page,
        limit,
    };
  }

  async getTrainerById(id: string)
  {
    const user = await this.userRepo.findOne({where:{userId: id},select:{
      userId: true,
      name: true,
      followersCount: true,
      profilePictureUrl: true,
      createdAt: true,
    }});
    return user;
  }

  async getNearestUsers(longitude: number, latitude: number) {
    const qb = this.userRepo.createQueryBuilder('user');
    qb.where(
      `ST_DWithin(
        "user"."point"::geography,
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
        :radius
      )`,
      { longitude, latitude, radius: 90000 } // 9 km radius
    ).andWhere('user.role = :role', { role: 'USER' }) // Only consider users, not trainers
    .select(['user.email AS email'])
      .limit(100);
    const users = await qb.getRawMany();
    return users.map(user => user.email);
  }

  async getFollowersEmail(userId: string):Promise<string[]>
  {
    const qb = this.followRepo
        .createQueryBuilder('follow')
        .innerJoin('follow.follower', 'follower')
        .where('follow.followingId = :userId', { userId })
        .select([
            'follower.email AS email',
        ]);
    const result = await qb.getRawMany();
    return result.map(r => r.email);
  }

  async notifyUsersForNewSession(sessionData: SessionCreatedEvent, users: string[],message:string)
  {

    const trainer = await this.getTrainerById(sessionData.userId);
    if(!trainer)//should not happen 
    {
      this.appLogger.logError({
        functionName: 'notifyUsersForNewSession',
        problem: `Trainer with userId: ${sessionData.userId} not found in search service while trying to notify users for new session`,
        error: new Error('Trainer not found')
      });
      return;
    }
    const event = new SessionNotifyEvent({
      eventId: randomBytes(16).toString('hex'),
      sessionId: sessionData.sessionId,
      trainerId: sessionData.userId,
      trainerName: trainer.name,
      trainerPhotoUrl: trainer.profilePictureUrl,
      address: sessionData.address,
      longitude: sessionData.longitude,
      latitude: sessionData.latitude,
      users, 
      message,
      price: sessionData.price,
      startTime: sessionData.startTime,
      title: sessionData.title,
    });
    this.kafka.emit(KAFKA_TOPICS.NEW_SESSION_NOTIFICATION, event);
    this.appLogger.logInfo({
      functionName: 'notifyUsersForNewSession',
      message: `Notifying ${users.length} users about new session with sessionId: ${sessionData.sessionId}`,
      additionalData: {
        message
      }
    });
  }

  async changeSessionStatus(sessionsId: string[], status: SessionStatus)
  {
    return this.sessionRepo.createQueryBuilder('session')
      .update()
      .set({ status })
      .where('"session"."sessionId" IN (:...sessionsId)', { sessionsId })
      .execute();
  }
}
