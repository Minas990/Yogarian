import { Processor, WorkerHost } from "@nestjs/bullmq";
import { QUEUE_CONSTANTS } from "./queues.constants";
import { Job } from "bullmq";
import { ReservationsService } from "../reservations.service";
import { ClientKafka } from "@nestjs/microservices";
import { Inject } from "@nestjs/common";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { InjectRepository } from "@nestjs/typeorm";
import { Reservation } from "../models/reservation.model";
import { Repository } from "typeorm";
import { AppLoggerService, ReservationStatus } from "@app/common";
import { RefundReservationCommand } from "@app/common/commands";


@Processor(QUEUE_CONSTANTS.REFUND_ALL_USERS)
export class RefundAllUsersProcessor extends WorkerHost
{
    constructor(
        @InjectRepository(Reservation) private readonly reservationRepository : Repository<Reservation>,
        @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka,
        private readonly applogger: AppLoggerService,
    ){
        super();
    }

    async process(job: Job<{sessionId: string}>, token?: string)
    {
        let ok = 0;
        const reservations = await this.reservationRepository.findBy({sessionId: job.data.sessionId, status: ReservationStatus.CONFIRMED});//they will be confirmed because the session will be deleted after 30 minutes of the first reservation that is awaiting payment, so all awaiting payment reservations will be cancelled and all confirmed reservations will be refunded
        try 
        {
            for(const reservation of reservations)
            {
                reservation.status = ReservationStatus.REFUND_PENDING;
                this.kafkaClient.emit(KAFKA_TOPICS.REFUND_RESERVATION_COMMAND, new RefundReservationCommand({
                    requestId: reservation.requestId,
                    userId: reservation.userId,
                    sessionId: reservation.sessionId,
                })) //what will happen if this does not work? :)
                //lets just hope not  for now at least 
                //i make it open for a user to refund 
                await this.reservationRepository.save(reservation);
                ok++;
            }
        }
        catch(error)
        {
            this.applogger.logError({
                error,
                functionName: 'RefundAllUsersProcessor.process',
                problem: `Failed to refund all users for session ${job.data.sessionId}`,
            })
            throw error;
        }

        if(ok === reservations.length)//this doesnt have any thing related to the refunding logic //it's only to track wheather all reservations statuses are updated 
        {
            this.applogger.logInfo({
                functionName: 'RefundAllUsersProcessor.process',
                message: `Refund all users job completed for session ${job.data.sessionId}`,
            });
            this.kafkaClient.emit(KAFKA_TOPICS.ALL_USERS_REFUNDED, {sessionId: job.data.sessionId});
            //plz note here: !!!!!Importnat!!!!!!!
            /*
                this (ok var )not to track wheather the refunding is successed or not 
                it only to track whether all reservations statuses are updated to REFUND_PENDING or not
                the other problem are more complicated than that and will require extra logic in sessions service 
                plz read this carefully and dont got tricked by the name of the variable 
             */
        } 
    }
}