import { Test, TestingModule } from '@nestjs/testing';
import { SessionsServiceController } from './sessions-service.controller';
import { SessionsServiceService } from './sessions-service.service';

describe('SessionsServiceController', () => {
  let sessionsServiceController: SessionsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SessionsServiceController],
      providers: [SessionsServiceService],
    }).compile();

    sessionsServiceController = app.get<SessionsServiceController>(SessionsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(sessionsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
