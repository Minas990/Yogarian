import { Module } from '@nestjs/common';
import { ReservationsServiceController } from './reservations-service.controller';
import { ReservationsServiceService } from './reservations-service.service';

@Module({
  imports: [],
  controllers: [ReservationsServiceController],
  providers: [ReservationsServiceService],
})
export class ReservationsServiceModule {}
