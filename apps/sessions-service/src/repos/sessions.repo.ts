import { AbstractRepository } from '@app/database/database,repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Session } from '../models/session.model';
import { GetSessionsQuery } from '../types/get-sessions.type';

@Injectable()
export class SessionsRepository extends AbstractRepository<Session> {
  constructor(
    @InjectRepository(Session) sessionRepository: Repository<Session>,
    entityManager: EntityManager,
  ) {
    super(sessionRepository, entityManager);
  }

  async findOneOrNull(where: FindOptionsWhere<Session>): Promise<Session | null> {
    return this.entityRepository.findOne({ where });
  }

  async findPaginated(
    where: FindOptionsWhere<Session>,
    page: number,
    limit: number,
  ): Promise<{ data: Session[]; total: number }> {
    const [data, total] = await this.entityRepository.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { startTime: 'ASC' } as any,
    });
    return { data, total };
  }

  async findAllFiltered(
    query: GetSessionsQuery,
  ): Promise<{ data: Session[]; total: number }> {
    const { page = 1, limit = 10, trainerId, location, minPrice, maxPrice, startDate, endDate } = query;

    const qb = this.entityRepository.createQueryBuilder('session');

    if (trainerId) {
      qb.andWhere('session.trainerId = :trainerId', { trainerId });
    }
    if (location) {
      qb.andWhere('session.location ILIKE :location', { location: `%${location}%` });
    }
    if (minPrice !== undefined) {
      qb.andWhere('session.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      qb.andWhere('session.price <= :maxPrice', { maxPrice });
    }
    if (startDate) {
      qb.andWhere('session.startTime >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('session.endTime <= :endDate', { endDate });
    }

    qb.orderBy('session.startTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findNearestSessions(
    latitude: number,
    longitude: number,
    radiusKm: number,
    page: number,
    limit: number,
  ): Promise<{ data: (Session & { distance: number })[]; total: number }> {
    const radiusMeters = radiusKm * 1000;
    const offset = (page - 1) * limit;

    const total = await this.entityRepository
      .createQueryBuilder('session')
      .where(
        `ST_DWithin(
          session.geo,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radiusMeters
        )`,
        { longitude, latitude, radiusMeters },
      )
      .getCount();

    const { entities, raw } = await this.entityRepository
      .createQueryBuilder('session')
      .addSelect(
        `ST_Distance(
          session.geo,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
        )`,
        'distance',
      )
      .where(
        `ST_DWithin(
          session.geo,
          ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
          :radiusMeters
        )`,
      )
      .setParameters({ longitude, latitude, radiusMeters })
      .orderBy('distance', 'ASC')
      .offset(offset)
      .limit(limit)
      .getRawAndEntities();

    const data = entities.map((entity, i) => ({
      ...entity,
      distance: Math.round(parseFloat(raw[i]?.distance ?? '0')),
    }));

    return { data, total };
  }
}
