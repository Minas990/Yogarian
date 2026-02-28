import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NOTIFICATION_STATUS } from '../types/notification.type';
import { NotificationsService } from '../notifications-service.service';

@Injectable()
export class NotificationOutboxPoller {
  private readonly logger = new Logger(NotificationOutboxPoller.name);
  private isPolling = false;
  private isRescuing = false;

  constructor(private readonly notificationsService: NotificationsService) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async pollPendingTasks(): Promise<void> {
    if (this.isPolling) return; 
    this.isPolling = true;

    try 
    {
      const tasks = await this.notificationsService.getPendingTasks(100);
      if (tasks.length === 0) return;
      this.logger.log(`outbox poller: found ${tasks.length} pending task(s)`);
      await Promise.allSettled(
        tasks.map(task =>
          this.notificationsService.enqueueTask(task).catch(err => {
            this.logger.error(`Failed to enqueue task ${task.id}: ${err.message}`);
          })
        )
      );
    } 
    catch (error) {
      this.logger.error(`Outbox poller error: ${error.message}`);
    } 
    finally {
      this.isPolling = false;
    }
  }

  //resuce task stucked in processing
  @Cron(CronExpression.EVERY_10_MINUTES)
  async rescueStuckTasks(): Promise<void> 
  {
    if (this.isRescuing) return;
    this.isRescuing = true;

    try 
    {
      const stuckTasks = await this.notificationsService.getStuckProcessingTasks(15);
      if (stuckTasks.length === 0) return;

      this.logger.warn(`Rescue poller: resetting ${stuckTasks.length} stuck task(s) to PENDING`);

      await Promise.allSettled(
        stuckTasks.map(task =>
          this.notificationsService.updateEmailTaskStatus(task.id, NOTIFICATION_STATUS.PENDING)
        )
      );
    } 
    catch (error) {
      this.logger.error(`Rescue poller error: ${error.message}`);
    } 
    finally {
      this.isRescuing = false;
    }
  }
}