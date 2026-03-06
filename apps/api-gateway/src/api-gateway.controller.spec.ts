import { Test, TestingModule } from '@nestjs/testing';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { Request, Response } from 'express';

describe('ApiGatewayController', () => {
  let apiGatewayController: ApiGatewayController;
  let apiGatewayService: ApiGatewayService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ApiGatewayController],
      providers: [
        {
          provide: ApiGatewayService,
          useValue: {
            proxyRequest: jest.fn(),
          },
        },
      ],
    }).compile();

    apiGatewayController = app.get<ApiGatewayController>(ApiGatewayController);
    apiGatewayService = app.get<ApiGatewayService>(ApiGatewayService);
  });

  it('forwards requests to ApiGatewayService', async () => {
    const req = {} as Request;
    const res = {} as Response;

    await apiGatewayController.proxy(req, res);

    expect(apiGatewayService.proxyRequest).toHaveBeenCalledWith(req, res);
  });
});
