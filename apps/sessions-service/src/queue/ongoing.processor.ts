import { Processor, WorkerHost } from "@nestjs/bullmq";
import { QUEUE_CONSTANTS } from "./queues.constants";
import { Job } from "bullmq";
import { SessionsService } from "../services/sessions.service";
import { Inject, Logger } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { SessionOngoingEvent } from "@app/common";


@Processor(QUEUE_CONSTANTS.RUNNING_SESSIONS)
export class RunningSessionsProcessor extends WorkerHost
{
    private readonly logger = new Logger(RunningSessionsProcessor.name);
    constructor(private readonly SessionsService: SessionsService,
     @Inject(KAFKA_SERVICE)   private readonly kafka: ClientKafka
    )
    {
        super();
    }
    async process(job: Job): Promise<void> {

        try
        {
            console.log('Processing job to move running sessions to ongoing...');
            const updated = await this.SessionsService.moveRunningSessionsToOngoing();
            this.logger.log(`Updated ${updated.length} sessions to ONGOING.`);
            if(updated.length == 0 ) return;
            const event = new SessionOngoingEvent({sessionsId:updated});
            this.kafka.emit(KAFKA_TOPICS.SESSIONS_ONGOING, event);
        }
        catch(error)
        {
            this.logger.error('Error processing running sessions job', error);
        }
    }

}