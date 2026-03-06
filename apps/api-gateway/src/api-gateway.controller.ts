import { All, Controller, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiGatewayService } from './api-gateway.service';

@Controller()
export class ApiGatewayController {
  constructor(private readonly apiGatewayService: ApiGatewayService) {}

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.apiGatewayService.proxyRequest(req, res);
  }
}
