import { Injectable, BadRequestException, NotFoundException, Inject, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { SessionsRepository } from '../repos/sessions.repo';
import { type ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { AppLoggerService, SessionCreatedEvent, SessionDeletedEvent, SessionImagesCreationApprovedEvent, SessionImagesCreationRejectedEvent, SessionImagesDeletionApprovedEvent, SessionImagesDeletionRejectedEvent, SessionUpdatedEvent } from '@app/common';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { Session } from '../models/session.model';
import { SessionStatus } from '../../../../libs/common/src/types/sessions-status.type';
import { In, LessThanOrEqual } from 'typeorm';
import { CreateLocationRequest, LOCATION_SERVICE_NAME, type LocationServiceClient, UpdateLocationRequest } from '@app/common/generated/location';
import { firstValueFrom } from 'rxjs';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_CONSTANTS } from '../queue/queues.constants';
import { Queue } from 'bullmq';

@Injectable()
export class SessionsService implements OnModuleInit {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    @Inject(KAFKA_SERVICE) private readonly kafka: ClientKafka,
    private readonly appLogger: AppLoggerService,
    @Inject(LOCATION_SERVICE_NAME) private readonly locationGrpcClient: ClientGrpc,
    @InjectQueue(QUEUE_CONSTANTS.RUNNING_SESSIONS) private readonly runningSessionsQueue: Queue,
    @InjectQueue(QUEUE_CONSTANTS.COMPLETED_SESSIONS) private readonly completedSessionsQueue: Queue,
) {}

  private locationService: LocationServiceClient;

  private async initilizeQueues(queue: Queue, jobName: string, schedule: number) 
  {
    const runninJobs = await queue.getJobSchedulersCount();
    if(runninJobs === 0)
    {
      await queue.add(jobName, {}, {
        repeat: {
          every: schedule,
        },
        removeOnComplete:true
      });
      this.appLogger.logInfo({
        functionName: 'initilizeQueues',
        message: `Scheduled job ${jobName} with schedule ${schedule}`,
      });
    }
  }
  async onModuleInit() {
    await this.kafka.connect();
    this.locationService = this.locationGrpcClient.getService<LocationServiceClient>('LocationService');
    await this.initilizeQueues(this.runningSessionsQueue, 'moveRunningSessionsToOngoing',  60 * 1000);
    await this.initilizeQueues(this.completedSessionsQueue, 'moveOnGoingSessionsToCompleted',  60 * 1000);
  }

  async create(userId: string, createSessionDto: CreateSessionDto): Promise<Session> {
    this.appLogger.logInfo({
      functionName: 'create',
      message: `Creating session for userId: ${userId}`,
      userId: userId,
    });

    const session = new Session({
      ...createSessionDto,
      trainerId: userId,
      status: SessionStatus.PENDING,
      currentParticipants: 0,
    });

    const createdSession = await this.sessionsRepository.create(session);

    
    const locationPayload: CreateLocationRequest = {
      ownerId: createdSession.id,
      ...createSessionDto.location,
      address: createSessionDto.location.address,
      latitude: createSessionDto.location.latitude,
      longitude: createSessionDto.location.longitude,
      createdAt: createdSession.createdAt.toISOString(), 
      governorate: createSessionDto.location.governorate,
    };
    const locationResult = await firstValueFrom(this.locationService.createLocation({...locationPayload}));
    if (!locationResult.success) {
      await this.sessionsRepository.findOneAndDelete({ id: createdSession.id });
      throw new BadRequestException('Location creation failed: ' + locationResult.error);
    }
    this.appLogger.logInfo({
      functionName: 'create',
      message: `Session and location created with id: ${createdSession.id}`,
      userId: userId,
      additionalData: { sessionId: createdSession.id },
    });
    
    session.status = SessionStatus.UPCOMING;
    const result = await this.sessionsRepository.create(session); 
    
    const event = new SessionCreatedEvent({...result});
    event.latitude = locationResult.latitude;
    event.longitude = locationResult.longitude;
    event.governorate = locationResult.governorate;
    event.address = locationResult.address;
    event.sessionId = result.id;
    event.userId = result.trainerId;
    this.kafka.emit(KAFKA_TOPICS.SESSION_CREATED, event);
    return result;
  }


  async getSessionById(id: string): Promise<Session> {
    return this.sessionsRepository.findOne({ id });
  }

  async updateSession(userId: string, id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.sessionsRepository.findOne({ id, status:In([SessionStatus.UPCOMING,SessionStatus.PENDING]) });
    if (session.trainerId !== userId) {
      throw new ForbiddenException('You are not authorized to update this session');
    }

    const now = Date.now();
    const start = new Date(session.startTime).getTime();
    const twelveHours = 12 * 60 * 60 * 1000;

    if (start - now <= twelveHours)
        throw new BadRequestException(
            'You cannot update sessions that start within the next 12 hours'
        );
    if(updateSessionDto.maxParticipants && updateSessionDto.maxParticipants < session.currentParticipants)
        throw new BadRequestException('Max participants cannot be less than current participants');
    
    if(session.currentParticipants && updateSessionDto.price)    
      throw new BadRequestException('You cannot update the price of a session that already has participants');

    const updateData: any = { ...updateSessionDto };
    let location = updateData.location;
    delete updateData.location;

    Object.assign(session,updateData);
    const updatedSession = await this.sessionsRepository.create(session);
    const event = new SessionUpdatedEvent({
      ...updateData
    });
    if (location) {
      const locationPayload:UpdateLocationRequest = {
        ownerId: id,
        ...location,
      };
      const locationResult = await firstValueFrom(this.locationService.updateLocation({...locationPayload}));
      if (!locationResult.success) {
        throw new BadRequestException('Location update failed: ' + locationResult.error);
      }
      this.appLogger.logInfo({
        functionName: 'updateSession',
        message: `Session and location updated for session with id: ${id}`,
        userId: userId,
        additionalData: { sessionId: id },
      });
      
      locationResult.success=undefined as any;
      Object.assign(event,locationResult);
    }
    event.sessionId = session.id;
    this.kafka.emit(KAFKA_TOPICS.SESSION_UPDATED, event);
    return updatedSession;
  }

  async deleteSession(userId: string, id: string): Promise<{ message: string }> {
    const session = await this.sessionsRepository.findOne({ id });
    if (session.trainerId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this session');
    }
    if(session.currentParticipants)
      throw new BadRequestException('You cannot delete a session that already has participants');
    
    await this.sessionsRepository.findOneAndDelete({ id });

    this.kafka.emit(
      KAFKA_TOPICS.SESSION_DELETED,
      new SessionDeletedEvent({ sessionId: id })
    );

    this.appLogger.logInfo({
      functionName: 'deleteSession',
      message: `Session with id: ${id} deleted successfully`,
      userId: userId,
    });

    return { message: 'Session deleted successfully' };
  }


  async handleUserDeleted(userId: string) {
    this.appLogger.logInfo({
      functionName: 'handleUserDeleted',
      message: `Handling user deleted event for userId: ${userId}, deleting trainer sessions`,
      userId,
    });

      const sessions = await this.sessionsRepository.find({ trainerId: userId });
      
      for (const session of sessions) {
        try 
        {
          await this.sessionsRepository.findOneAndDelete({ id: session.id });
          
          this.kafka.emit(
            KAFKA_TOPICS.SESSION_DELETED,
            new SessionDeletedEvent({ sessionId: session.id })
          );
          
          this.appLogger.logInfo({
            functionName: 'handleUserDeleted',
            message: `Deleted session ${session.id} for trainer ${userId}`,
            userId,
            additionalData: { sessionId: session.id },
          });
        }
        catch (error)        {
          this.appLogger.logError({
            functionName: 'handleUserDeleted',
            problem: `Failed to delete session ${session.id} for trainer ${userId}: ${error.message}`,
            userId,
            additionalData: { sessionId: session.id },
            error,
          });
        }
      

      this.appLogger.logInfo({
        functionName: 'handleUserDeleted',
        message: `Successfully deleted ${sessions.length} sessions for trainer ${userId}`,
        userId,
        additionalData: { deletedCount: sessions.length },
      });
    } 
  }

  async handleImagesCreated(userId:string,sessionId:string,photoIds:number[],urls:string[])
  {
    try
    {
      const session = await this.sessionsRepository.findOne({id:sessionId,trainerId:userId,status: SessionStatus.UPCOMING});
      if(!session)         throw new NotFoundException('Session not found or you are not the trainer of this session');

      this.kafka.emit(KAFKA_TOPICS.SESSION_IMAGES_CREATION_APPROVED,new SessionImagesCreationApprovedEvent({sessionId,photoIds,userId,urls}));
      this.appLogger.logInfo({
        functionName: 'handleImagesCreated',
        message: `Approved images creation for session ${sessionId} by user ${userId}`,
        userId,
        additionalData: { sessionId, photoIds },
      });
    } 
    catch(error)
    {
      this.appLogger.logError({
        functionName: 'handleImagesCreated',
        problem: `Failed to handle images created for session ${sessionId} by user ${userId}: ${error.message}`,
        userId,
        error,
      });
      this.kafka.emit(KAFKA_TOPICS.SESSION_IMAGES_CREATION_REJECTED,new SessionImagesCreationRejectedEvent({sessionId,photoIds,userId,problem:error.message}));
    }
  } 

  async handleSessionImagesDeleted(userId:string,sessionId:string,photoIds:number[])
  {
    try
    {
      const session = await this.sessionsRepository.findOne({id:sessionId,trainerId:userId});
      if(!session) 
        throw new NotFoundException('Session not found or you are not the trainer of this session');
      this.kafka.emit(KAFKA_TOPICS.SESSION_IMAGES_DELETION_APPROVED,new SessionImagesDeletionApprovedEvent({sessionId,photoIds,userId}));
      this.appLogger.logInfo({
        functionName: 'handleSessionImagesDeleted',
        message: `Approved image deletion for session ${sessionId} by user ${userId}`,
        userId,
        additionalData: { sessionId, photoIds },
      });
    }
    catch(error)
    {
      this.appLogger.logError({
        functionName: 'handleSessionImagesDeleted',
        problem: `Failed to handle image deletion for session ${sessionId} by user ${userId}: ${error.message}`,
        userId,
        error,
      });
      this.kafka.emit(KAFKA_TOPICS.SESSION_IMAGES_DELETION_REJECTED,new SessionImagesDeletionRejectedEvent({sessionId,photoIds,userId,problem:error.message}));
    }
  }

  async moveRunningSessionsToOngoing() : Promise<string[]>
  {
    
    const now = new Date();
    const sessionsToUpdate = await this.sessionsRepository.createQueryBuilder('session')
    .where("status = :status", { status: SessionStatus.UPCOMING })
    .andWhere('"startTime" <= :now', { now })
    .limit(100)
    .select('id').getRawMany();
    const sessionIds = sessionsToUpdate.map(s => s.id); 
    if(sessionIds.length === 0) return [];
    await this.sessionsRepository.createQueryBuilder()
    .update()
    .set({ status: SessionStatus.ONGOING })
    .whereInIds(sessionIds)
    .execute();
    return sessionIds;
  }

async moveOnGoingSessionsToCompleted(): Promise<string[]> {
  const now = new Date();
  const sessionsToUpdate = await this.sessionsRepository.createQueryBuilder('session')
    .where('status = :status', { status: SessionStatus.ONGOING })
    .andWhere('"startTime" + INTERVAL \'1 minute\' * "duration" <= :now', { now })
    .select('id')
    .limit(100)
    .getRawMany();
  const sessionIds = sessionsToUpdate.map(s => s.id);
  if (sessionIds.length === 0) return [];
  await this.sessionsRepository.createQueryBuilder('session')
    .update()
    .set({ status: SessionStatus.COMPLETED })
    .whereInIds(sessionIds)
    .execute();
  return sessionIds;
}
}
