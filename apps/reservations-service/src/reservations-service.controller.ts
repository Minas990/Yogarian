import { Controller, Get } from '@nestjs/common';
import { ReservationsServiceService } from './reservations-service.service';

@Controller()
export class ReservationsServiceController {
  constructor(private readonly reservationsServiceService: ReservationsServiceService) {}

  @Get()
  getHello(): string {
    return this.reservationsServiceService.getHello();
  }
}
