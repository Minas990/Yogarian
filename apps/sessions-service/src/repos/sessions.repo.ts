import { AbstractRepository } from '@app/database/database,repository';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsRelations, FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity.js';
import { Session } from '../models/session.model';
import { SessionStatus } from '../../../../libs/common/src/types/sessions-status.type';

interface FilterOptions {
  trainerId?: string;
  minPrice?: number;
  maxPrice?: number;
  minStartTime?: Date;
  duration?: number;
  skip: number;
  take: number;
}

@Injectable()
export class SessionsRepository extends AbstractRepository<Session> {
  constructor(
    @InjectRepository(Session) sessionRepository: Repository<Session>,
    entityManager: EntityManager,
  ) {
    super(sessionRepository, entityManager);
  }


  
  createQueryBuilder(alias?: string): SelectQueryBuilder<Session> {
        return this.entityRepository.createQueryBuilder(alias);
    }
}
