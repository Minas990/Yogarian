import { Module } from '@nestjs/common';
import { PaymentServiceController } from './payments-service.controller';
import { PaymentServiceService } from './payments-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@app/database';
import { PaymentEntity } from './models/payment.model';
import { LoggerModule } from '@app/common';
import { KafkaModule } from '@app/kafka';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env','apps/payments-service/.env']
    }),
    DatabaseModule,
    DatabaseModule.forFeature([PaymentEntity]),
    LoggerModule.forService('PaymentService'),
    KafkaModule.register()
  ],
  controllers: [PaymentServiceController],
  providers: [PaymentServiceService],
})
export class PaymentServiceModule {}
