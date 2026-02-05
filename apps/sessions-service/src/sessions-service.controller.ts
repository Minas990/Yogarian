import { Controller, Get } from '@nestjs/common';
import { SessionsServiceService } from './sessions-service.service';

@Controller()
export class SessionsServiceController {
  constructor(private readonly sessionsServiceService: SessionsServiceService) {}

  @Get()
  getHello(): string {
    return this.sessionsServiceService.getHello();
  }
}
