import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { DataSource, Repository } from 'typeorm';

import { NOTIFICATION_STATUS } from './types/notification.type';
import { QUEUE_CONSTANTS } from './queue/constants.queue';
import { NotificationEvent } from './models/event.model';
import { NotificationEmailTask } from './models/email-task.model';
import { CreateEmailTaskDto } from './types/CreateEmailTaskDto,dto';
import { KafkaTopics } from '@app/kafka';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEvent)
    private readonly eventRepo: Repository<NotificationEvent>,

    @InjectRepository(NotificationEmailTask)
    private readonly emailTaskRepo: Repository<NotificationEmailTask>,

    @InjectQueue(QUEUE_CONSTANTS.NOTIFICATIONS_QUEUE)
    private readonly notificationQueue: Queue,

    private readonly dataSource: DataSource,
  ) {}

  
  async createEventWithTasks(
    eventData: { eventId: string; eventType: KafkaTopics; emitter: string; payload: any },
    tasks: CreateEmailTaskDto[]
  ): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const event = manager.create(NotificationEvent, {
        eventId: eventData.eventId,
        eventType: eventData.eventType,
        emitter: eventData.emitter,
        payload: eventData.payload,

      });
      const savedEvent = await manager.save(NotificationEvent, event);

      const emailTasks = tasks.map(task =>
        manager.create(NotificationEmailTask, {
          ...task,
          priority: task.priority ?? 0,
          event: savedEvent,
          status: NOTIFICATION_STATUS.PENDING,
        })
      );

      await manager.save(NotificationEmailTask, emailTasks);
    });
  }

  
  async getPendingTasks(limit: number): Promise<NotificationEmailTask[]> 
  {
    return this.emailTaskRepo.find({
      where: { status: NOTIFICATION_STATUS.PENDING },
      order: { priority: 'ASC', createdAt: 'ASC' },
      take: limit,
    });
  }

  
  async getStuckProcessingTasks(stuckForMinutes: number): Promise<NotificationEmailTask[]> {
    const cutoff = new Date(Date.now() - stuckForMinutes * 60 * 1000);
    return this.emailTaskRepo
      .createQueryBuilder('task')
      .where('task.status = :status', { status: NOTIFICATION_STATUS.PROCESSING })
      .andWhere('task.updatedAt < :cutoff', { cutoff })
      .getMany();
  }

  async getEmailTaskById(taskId: string): Promise<NotificationEmailTask | null> {
    return this.emailTaskRepo.findOneBy({ id: taskId });
  }

  async updateEmailTaskStatus(
    taskId: string,
    status: NOTIFICATION_STATUS,
    errorMessage?: string
  ): Promise<void> {
    await this.emailTaskRepo.update(
      { id: taskId },
      {
        status,
        ...(errorMessage && {
          lastError: errorMessage,
          retryCount: () => '"retryCount" + 1',
        }),
      }
    );
  }

  async enqueueTask(task: NotificationEmailTask): Promise<void> {
    await this.emailTaskRepo.update({ id: task.id }, { status: NOTIFICATION_STATUS.QUEUED });

    try {
      await this.notificationQueue.add(
        'notification-email',
        { taskId: task.id },
        {
          priority: task.priority,
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: false,
        }
      );
    } catch (error) {
      await this.emailTaskRepo.update({ id: task.id }, { status: NOTIFICATION_STATUS.PENDING });
      throw error;
    }
  }
}