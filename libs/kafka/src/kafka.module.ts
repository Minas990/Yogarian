import { DynamicModule, Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {  ConfigService } from '@nestjs/config';
import { KAFKA_BROKER, KAFKA_CLIENT_ID, KAFKA_CONSUMER_GROUP } from './constants/kafka.constants';

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
            name: 'KAFKA_SERVICE',
            inject: [ConfigService],
            useFactory: (cs: ConfigService) => 
            {
              return  {
                transport:Transport.KAFKA,
                options: {
                  client : {
                    clientId : cs.get<string>('KAFKA_CLIENT_ID') || KAFKA_CLIENT_ID,
                    brokers : cs.get<string>('KAFKA_BROKERS')?.split(',') || [KAFKA_BROKER]
                  },
                  consumer : {
                    groupId : consumerGroup ?? cs.get<string>('KAFKA_CONSUMER_GROUP_ID') ?? KAFKA_CONSUMER_GROUP,
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
