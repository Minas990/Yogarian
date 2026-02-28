import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../email/email.service';
import { NOTIFICATION_STATUS } from '../types/notification.type';
import { QUEUE_CONSTANTS } from './constants.queue';
import { NotificationsService } from '../notifications-service.service';

@Processor(QUEUE_CONSTANTS.NOTIFICATIONS_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    const { taskId } = job.data;

    const task = await this.notificationsService.getEmailTaskById(taskId);
    if (!task) {
      this.logger.warn(`Task ${taskId} not found, skipping`);
      return;
    }

    if (task.status === NOTIFICATION_STATUS.SENT) {
      this.logger.warn(`Task ${taskId} already sent, skipping`);
      return;
    }

    await this.notificationsService.updateEmailTaskStatus(task.id, NOTIFICATION_STATUS.PROCESSING);

    try {
      await this.emailService.sendEmailFromTemplate(
        task.email,
        task.subject,
        task.templateName,
        task.payload,
        task.userId,
      );
      await this.notificationsService.updateEmailTaskStatus(task.id, NOTIFICATION_STATUS.SENT);
    } catch (error) {
      await this.notificationsService.updateEmailTaskStatus(
        task.id,
        NOTIFICATION_STATUS.FAILED,
        error.message,
      );
      throw error; 
    }
  }
}