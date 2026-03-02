import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../models/reservation.model';
import { ReservationStatus } from '@app/common/types/reservation-status.type';
import { AppLoggerService } from '@app/common';
import { QUEUE_CONSTANTS } from './queues.constants';

@Processor(QUEUE_CONSTANTS.REFUND_TIMEOUT)
export class RefundTimeoutProcessor extends WorkerHost {
  constructor(
    @InjectRepository(Reservation) private readonly reservationRepository: Repository<Reservation>,
    private readonly logger: AppLoggerService,
  ) {
    super();
  }

  async process(job: Job<{ requestId: string; sessionId: string }>): Promise<void> {
    const { requestId, sessionId } = job.data;

    this.logger.logInfo({
      message: `Processing refund timeout check for request ${requestId} (session: ${sessionId})`,
      functionName: 'RefundTimeoutProcessor.process',
      additionalData: { requestId, sessionId },
    });

    const reservation = await this.reservationRepository.findOneBy({ requestId, sessionId });

    if (!reservation) {
      this.logger.logError({
        problem: `Refund timeout job executed but reservation not found (request: ${requestId})`,
        functionName: 'RefundTimeoutProcessor.process',
        error: new Error('Reservation not found'),
        additionalData: { requestId, sessionId },
      });
      return;
    }

    if (reservation.status !== ReservationStatus.REFUND_PENDING) {
      this.logger.logInfo({
        message: `Refund timeout job skipped - reservation no longer REFUND_PENDING (status: ${reservation.status}, request: ${requestId})`,
        functionName: 'RefundTimeoutProcessor.process',
        additionalData: { requestId, sessionId, currentStatus: reservation.status },
      });
      return;
    }

    this.logger.logError({
      problem: `Refund timeout reached for request ${requestId} - Stripe webhook never arrived. Reverting to CONFIRMED.`,
      functionName: 'RefundTimeoutProcessor.process',
      error: new Error('Refund timeout'),
      additionalData: { requestId, sessionId },
    });

    reservation.status = ReservationStatus.CONFIRMED;
    reservation.failure_reason = 'Refund timeout - webhook never arrived from Stripe';
    await this.reservationRepository.save(reservation);

    this.logger.logInfo({
      message: `Refund timeout handled - reservation reverted to CONFIRMED (request: ${requestId})`,
      functionName: 'RefundTimeoutProcessor.process',
      additionalData: { requestId, sessionId, status: ReservationStatus.CONFIRMED },
    });
  }
}
