import { Injectable, BadRequestException, NotFoundException, Inject, OnModuleInit } from '@nestjs/common';
import { SessionsRepository } from '../repos/sessions.repo';
import { CreateSessionDto } from '../dto/create-session.dto';
import { UpdateSessionDto } from '../dto/update-session.dto';
import { Session } from '../models/session.model';
import { GetSessionsQuery } from '../types/get-sessions.type';
import { PaginatedResponse } from '../types/paginated-response.type';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { AppLoggerService } from '@app/common';

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

  async create(createSessionDto: CreateSessionDto, trainerId: string): Promise<Session> {
    try {
      const startTime = new Date(createSessionDto.startTime);
      const endTime = new Date(createSessionDto.endTime);

      if (endTime <= startTime)
        throw new BadRequestException('End time must be after start time');
      if (startTime <= new Date() || endTime <= new Date())
        throw new BadRequestException('Start and end time must be in the future');

      const session = new Session({
        ...createSessionDto,
        trainerId,
        startTime,
        endTime,
        currentParticipants: 0,
      });

      const result = await this.sessionsRepository.create(session);

      this.appLogger.logInfo({
        functionName: 'create',
        message: `Session created: ${result.id} by trainer ${trainerId}`,
        userId: trainerId,
        additionalData: { sessionId: result.id, title: result.title },
      });

      this.kafka.emit(KAFKA_TOPICS.SESSION_CREATED, {
        sessionId: result.id,
        trainerId,
        title: result.title,
        startTime: result.startTime,
      });

      return result;
    } catch (error) {
      this.appLogger.logError({
        functionName: 'create',
        problem: 'Failed to create session',
        error,
        additionalData: { trainerId },
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOneOrNull({ id } as any);
    if (!session)
      throw new NotFoundException(`Session with id ${id} not found`);
    return session;
  }

  async findByTrainerId(trainerId: string, page: number = 1, limit: number = 10): Promise<PaginatedResponse<Session>> {
    const { data, total } = await this.sessionsRepository.findPaginated({ trainerId } as any, page, limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAll(query: GetSessionsQuery): Promise<PaginatedResponse<Session>> {
    const { page = 1, limit = 10 } = query;
    const { data, total } = await this.sessionsRepository.findAllFiltered(query);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, trainerId: string): Promise<Session> {
    try {
      const session = await this.findById(id);

      if (session.trainerId !== trainerId) {
        throw new BadRequestException('You can only update your own sessions');
      }

      if (updateSessionDto.startTime || updateSessionDto.endTime) {
        const startTime = updateSessionDto.startTime ? new Date(updateSessionDto.startTime) : session.startTime;
        const endTime = updateSessionDto.endTime ? new Date(updateSessionDto.endTime) : session.endTime;

        if (endTime <= startTime) {
          throw new BadRequestException('End time must be after start time');
        }
      }

      const updated = await this.sessionsRepository.findOneAndUpdate({ id } as any, updateSessionDto);

      this.appLogger.logInfo({
        functionName: 'update',
        message: `Session updated: ${id} by trainer ${trainerId}`,
        userId: trainerId,
        additionalData: { sessionId: id },
      });

      return updated;
    } catch (error) {
      this.appLogger.logError({
        functionName: 'update',
        problem: 'Failed to update session',
        error,
        additionalData: { sessionId: id, trainerId },
      });
      throw error;
    }
  }

  async delete(id: string, trainerId: string): Promise<{ message: string }> {
    try {
      const session = await this.findById(id);

      if (session.trainerId !== trainerId) {
        throw new BadRequestException('You can only delete your own sessions');
      }

      await this.sessionsRepository.remove(session);

      this.appLogger.logInfo({
        functionName: 'delete',
        message: `Session deleted: ${id} by trainer ${trainerId}`,
        userId: trainerId,
        additionalData: { sessionId: id },
      });

      this.kafka.emit(KAFKA_TOPICS.SESSION_DELETED, { sessionId: id, trainerId });

      return { message: 'Session deleted successfully' };
    } catch (error) {
      this.appLogger.logError({
        functionName: 'delete',
        problem: 'Failed to delete session',
        error,
        additionalData: { sessionId: id, trainerId },
      });
      throw error;
    }
  }

  async findNearestSessions(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Session & { distance: number }>> {
    const { data, total } = await this.sessionsRepository.findNearestSessions(
      latitude,
      longitude,
      radiusKm,
      page,
      limit,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
