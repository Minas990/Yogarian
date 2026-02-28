import { Processor, WorkerHost } from "@nestjs/bullmq";
import { QUEUE_CONSTANTS } from "./queues.constants";
import { Job } from "bullmq";
import { SessionsService } from "../services/sessions.service";
import { Inject, Logger } from "@nestjs/common";
import { SessionCompletedEvent } from "@app/common";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { ClientKafka } from "@nestjs/microservices";



@Processor(QUEUE_CONSTANTS.COMPLETED_SESSIONS)
export class CompletedSessionsProcessor extends WorkerHost
{
    private readonly logger = new Logger(CompletedSessionsProcessor.name);
    constructor(private readonly SessionsService: SessionsService,
        @Inject(KAFKA_SERVICE) private readonly kafka:ClientKafka
    )
    {
        super();
    }
    async process(job: Job): Promise<void> {
        const updated = await this.SessionsService.moveOnGoingSessionsToCompleted();
        this.logger.log(`Updated ${updated} sessions to COMPLETED.`);
        if(updated.length == 0) return;
        const event = new SessionCompletedEvent({sessionsId:updated});
        this.kafka.emit(KAFKA_TOPICS.SESSIONS_COMPLETED, event);
    }

}