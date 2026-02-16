import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { AuthServiceService } from '../auth-service.service';
import { REDIS_OPTION, scheduleCleanupJob } from './cleanup.queue';
import { QUEUE_CONSTANTS } from '../constants/queue.constants';

@Injectable()
export class CleanupProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CleanupProcessor.name);
  private worker: Worker | null = null;
  
  constructor(private readonly authService: AuthServiceService) {}

  async onModuleInit() {
    this.worker = cleanupWorker(this);
    this.logger.log('Cleanup worker initialized');

    await scheduleCleanupJob();
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
      this.logger.log('Cleanup worker closed');
    }

  }

  async handleJob(job: Job) {
    this.logger.log(`Cleanup job tick at ${new Date().toISOString()}`);
    this.logger.log('Starting unconfirmed user cleanup job');
    
    const unconfirmedUsers = await this.authService.getUnconfirmedUsers();
    this.logger.log(`Found ${unconfirmedUsers.length} unconfirmed users (max 500) - 12h filter DISABLED for testing`);

    for (const user of unconfirmedUsers) {
      try {
        await this.authService.deleteAccount(user.userId);
        this.logger.log(`Deleted unconfirmed user: ${user.userId}`);
      } catch (error) {
        this.logger.error(`Failed to delete user ${user.userId}: ${error.message}`);
      }
    }

    this.logger.log(`Cleanup job completed. Deleted ${unconfirmedUsers.length} users`);
    return { deletedCount: unconfirmedUsers.length };
  }
}

export const cleanupWorker = (processor: CleanupProcessor) => {
  const worker = new Worker(
    QUEUE_CONSTANTS.UNCONFIRMED_EMAIL_CLEANUP_QUEUE,
    async (job: Job) => processor.handleJob(job),
    { connection: REDIS_OPTION },
  );

  worker.on('completed', (job) => {
    console.log(`Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  return worker;
};
