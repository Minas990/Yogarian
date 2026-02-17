import { Processor, WorkerHost } from "@nestjs/bullmq";
import { QUEUE_CONSTANTS } from "../constants/queue.constants";
import {  Logger } from "@nestjs/common";
import { AuthService } from "../auth-service.service";
import { Job } from "bullmq";

@Processor(QUEUE_CONSTANTS.UNCONFIRMED_EMAIL_CLEANUP_QUEUE)
export class CleanupProcessor extends WorkerHost
{
  private readonly logger = new Logger(CleanupProcessor.name);
  constructor(private readonly authService: AuthService)
  {
    super();
  }
  async process(job: Job): Promise<any>
  {
    const users =  await this.authService.getUnconfirmedUsers();
    this.logger.log(`Found ${users.length} unconfirmed users to cleanup`);
    let counter:number = 0;
    for(const user of users)
    {
      try 
      {
        await this.authService.deleteAccount(user.userId);
        counter++;
      }
      catch(error)
      {
        this.logger.error(`Failed to delete unconfirmed user with email: ${user.email} and userId: ${user.userId}`, error);
      }
    }
    this.logger.log(`Successfully cleaned up ${counter} unconfirmed users from ${users.length} candidates`);
  }
  
}