import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsServiceController } from './reservations-service.controller';
import { ReservationsServiceService } from './reservations-service.service';

describe('ReservationsServiceController', () => {
  let reservationsServiceController: ReservationsServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsServiceController],
      providers: [ReservationsServiceService],
    }).compile();

    reservationsServiceController = app.get<ReservationsServiceController>(ReservationsServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(reservationsServiceController.getHello()).toBe('Hello World!');
    });
  });
});
