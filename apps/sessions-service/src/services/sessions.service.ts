import { Injectable, BadRequestException, NotFoundException, Inject, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { SessionsRepository } from '../repos/sessions.repo';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { AppLoggerService, SessionCreatedEvent, SessionCreatedLocationEvent, SessionDeletedEvent, SessionUpdatedEvent } from '@app/common';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { GetSessionQueryDto } from '../dto/get-session-query.dto';
import { Session } from '../models/session.model';
import { SessionStatus } from '../types/sessions-status.type';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionsService implements OnModuleInit {
  constructor(
    private readonly sessionsRepository: SessionsRepository,
    @Inject(KAFKA_SERVICE) private readonly kafka: ClientKafka,
    private readonly appLogger: AppLoggerService,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
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

    const locationEvent = new SessionCreatedLocationEvent(createSessionDto.location);
    this.kafka.emit(
      KAFKA_TOPICS.SESSION_CREATED,
      new SessionCreatedEvent({
        ...locationEvent,
        sessionId: createdSession.id,
      })
    );

    this.appLogger.logInfo({
      functionName: 'create',
      message: `Session created with id: ${createdSession.id}`,
      userId: userId,
      additionalData: { sessionId: createdSession.id },
    });

    return createdSession;
  }

  async getSessions(query: GetSessionQueryDto): Promise<{ data: Session[]; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    return this.sessionsRepository.findSessionsWithFilters({
      trainerId: query.trainerId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minStartTime: query.minStartTime,
      duration: query.duration,
      skip,
      take: limit,
    });
  }

  async getSessionById(id: string): Promise<Session> {
    return this.sessionsRepository.findOne({ id });
  }

  async updateSession(userId: string, id: string, updateSessionDto: UpdateSessionDto): Promise<Session> {
    const session = await this.sessionsRepository.findOne({ id });
    if (session.trainerId !== userId) {
      throw new ForbiddenException('You are not authorized to update this session');
    }

    this.appLogger.logInfo({
      functionName: 'updateSession',
      message: `Updating session with id: ${id}`,
      userId: userId,
    });

    const updateData: any = { ...updateSessionDto };
    let location = updateData.location;
    delete updateData.location;
    updateData.status = SessionStatus.PENDING;

    const updatedSession = await this.sessionsRepository.findOneAndUpdate({ id }, updateData);

    if (location) {
      const locationEvent = new SessionCreatedLocationEvent(location);
      this.kafka.emit(
        KAFKA_TOPICS.SESSION_UPDATED,
        new SessionUpdatedEvent({
          ...locationEvent,
          sessionId: id,
        })
      );
    }

    this.appLogger.logInfo({
      functionName: 'updateSession',
      message: `Session with id: ${id} updated successfully`,
      userId: userId,
    });

    return updatedSession;
  }

  async deleteSession(userId: string, id: string): Promise<{ message: string }> {
    const session = await this.sessionsRepository.findOne({ id });
    if (session.trainerId !== userId) {
      throw new ForbiddenException('You are not authorized to delete this session');
    }

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

  async updateSessionSessionStatus(sessionId: string,status: SessionStatus)
  {

    try {          
    await this.sessionsRepository.findOneAndUpdate({id: sessionId}, {status});
    this.appLogger.logInfo({
      functionName: 'updateSessionSessionStatus',
      message: `Updated session with id: ${sessionId} to status: ${status}`,
    });
    } catch (err) {
      this.appLogger.logError({
        functionName: 'updateSessionSessionStatus',
        problem: `Failed to update session status for sessionId: ${sessionId} to status: ${status}`,
        error: err,
      });
    }

  }

  async handleUserDeleted(userId: string) {
    this.appLogger.logInfo({
      functionName: 'handleUserDeleted',
      message: `Handling user deleted event for userId: ${userId}, deleting trainer sessions`,
      userId,
    });

    try {
      const sessions = await this.sessionsRepository.find({ trainerId: userId });
      
      for (const session of sessions) {
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

      this.appLogger.logInfo({
        functionName: 'handleUserDeleted',
        message: `Successfully deleted ${sessions.length} sessions for trainer ${userId}`,
        userId,
        additionalData: { deletedCount: sessions.length },
      });
    } catch (error) {
      this.appLogger.logError({
        functionName: 'handleUserDeleted',
        problem: `Failed to delete sessions for trainer ${userId}`,
        userId,
        error: error.message,
      });
    }
  }

  // replica testing method
  async testReplicationFollowing() {
    console.log('!!!!! REPLICATION TEST STARTING !!');

    console.log('Step 1: Writing to MASTER (5437)...');
    const testId = `replication-test-${Date.now()}`;
    const testTrainerId = randomUUID();
    const newSession = await this.sessionsRepository.create(
      new Session({
        title: testId,
        description: 'Testing if slave follows master',
        trainerId: testTrainerId,
        maxParticipants: 10,
        startTime: new Date(Date.now() + 3600000),
        duration: 60,
        price: 100,
        status: SessionStatus.UPCOMING,
      })
    );
    console.log(`Written to MASTER - Session ID: ${newSession.id}`);
    console.log(`Title: ${testId}\n`);

    console.log('Step 2: Querying MASTER directly...');
    const countInMaster = await this.queryDatabase(
      `SELECT COUNT(*) as count FROM session WHERE title = '${testId}'`,
      'postgresql://sessions:sessions@localhost:5437/sessions'
    );
    console.log(`Count in MASTER: ${countInMaster}\n`);

    console.log('Step 3: Waiting 2 seconds for potential replication...');
    await this.sleep(2000);
    console.log('Step 4:Querying SLAVE directly...');
    const countInSlave = await this.queryDatabase(
      `SELECT COUNT(*) as count FROM session WHERE title = '${testId}'`,
      'postgresql://sessions:sessions@localhost:5438/sessions'
    );
    console.log(`Count in SLAVE: ${countInSlave}\n`);

    console.log('***********======********');
    console.log('REPLICATION TEST RESULTS');
    
    console.log(`Master has data: ${countInMaster > 0 ? 'y' : 'n'}`);
    console.log(`Slave has data:  ${countInSlave > 0 ? 'y' : 'n'}`);
    
    if (countInMaster > 0 && countInSlave > 0) {
      console.log('\nREPLICATION IS WORKING! Slave is following master.\n');
    } else if (countInMaster > 0 && countInSlave === 0) {
      console.log('\n REPLICATION NOT WORKING! Slave is NOT following master.');
      console.log(' PostgreSQL streaming replication is not configured.\n');
    } else {
      console.log('\nTEST FAILED! Data not found in master.\n');
    }
    return {
      testId,
      sessionId: newSession.id,
      masterHasData: countInMaster > 0,
      slaveHasData: countInSlave > 0,
      replicationWorking: countInMaster > 0 && countInSlave > 0,
    };
  }

  private async queryDatabase(query: string, connectionString: string): Promise<number> {
    const { Client } = require('pg');
    const client = new Client({ connectionString });
    
    try {
      await client.connect();
      const result = await client.query(query);
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error(`Error querying database:`, error.message);
      return 0;
    } finally {
      await client.end();
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
