import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {  ConfigService } from '@nestjs/config';
import { KAFKA_BROKER, KAFKA_SERVICE } from './constants/kafka.constants';

@Module({

})
export class KafkaModule 
{
  static register(consumerGroup?: string):DynamicModule
  {
    return  {

      module: KafkaModule,
      imports: [
        ClientsModule.registerAsync(
        [
          {
            name: KAFKA_SERVICE,
            inject: [ConfigService],
            useFactory: (cs: ConfigService) => 
            {
              return  {
                transport:Transport.KAFKA,
                options: {
                  client : {
                    clientId : cs.getOrThrow<string>('KAFKA_CLIENT_ID'),
                    brokers : cs.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
                  },
                  consumer : {
                    groupId : consumerGroup ?? cs.getOrThrow<string>('KAFKA_CONSUMER_GROUP_ID')
                  }
                }
              }
            }
          }
        ]) 
      ],
      exports: [ClientsModule]
    }
  }
}
