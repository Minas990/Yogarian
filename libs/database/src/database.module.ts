import { Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';

@Module({
  imports : [
    TypeOrmModule.forRootAsync({
      inject:[ConfigService],
      useFactory: (cs : ConfigService) => {
        const base = {
          type: 'postgres' as const,
          retryAttempts : 5,
          retryDelay : 3000,
          autoLoadEntities : true,
          synchronize : true,
        }
        const replicationEnabled = cs.get<string>('DATABASE_REPLICATION') === 'true';
        if(replicationEnabled)
        {
          return {
            ...base,
            replication: {
              master: {
                url: cs.get<string>('DATABASE_URL'),
              },
              slaves: cs.get<string>('DATABASE_SLAVE_URLS') ? cs.getOrThrow<string>('DATABASE_SLAVE_URLS').split(',').map(url => ({ url })) : [],
            }, 
          }
        }
        else 
        {
          return {
            ...base,
            url: cs.get<string>('DATABASE_URL'),
          }
        }
      }
    })
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})

export class DatabaseModule   
{
  static forFeature(model: EntityClassOrSchema[])
  {
    return TypeOrmModule.forFeature(model);
  } 
}
