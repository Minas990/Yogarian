import { AbstractRepository } from '@app/database/database,repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Session } from '../models/session.model';
import { SessionStatus } from '../types/sessions-status.type';

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

  async findAll(where: FindOptionsWhere<Session>, skip: number, take: number) {
    return this.entityRepository.find({
      where,
      skip,
      take,
      order: { startTime: 'ASC' },
    });
  }

  async countBy(where: FindOptionsWhere<Session>) {
    return this.entityRepository.count({ where });
  }

  async findByStatus(status: SessionStatus): Promise<Session[]> {
    return this.entityRepository.find({ where: { status } });
  }

  async findSessionsWithFilters(filters: FilterOptions): Promise<{ data: Session[]; total: number }> {
    let query = this.entityRepository.createQueryBuilder('session');
    if (filters.trainerId) {
      query = query.andWhere('session.trainerId = :trainerId', { trainerId: filters.trainerId });
    }
    if (filters.minPrice !== undefined) {
      query = query.andWhere('session.price >= :minPrice', { minPrice: filters.minPrice });
    }
    if (filters.maxPrice !== undefined) {
      query = query.andWhere('session.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }
    if (filters.minStartTime) {
      query = query.andWhere('session.startTime >= :minStartTime', { minStartTime: filters.minStartTime });
    }
    if (filters.duration !== undefined) {
      query = query.andWhere('session.duration = :duration', { duration: filters.duration });
    }
    const total = await query.getCount();

    const data = await query
      .orderBy('session.startTime', 'ASC')
      .skip(filters.skip)
      .take(filters.take)
      .getMany();

    return {
      data,
      total,
    };
  }

}
