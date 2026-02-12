import { AbstractRepository } from '@app/database/database,repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Repository } from 'typeorm';
import { Review } from '../models/review.model';

@Injectable()
export class ReviewsRepository extends AbstractRepository<Review> {
  constructor(
    @InjectRepository(Review) reviewRepository: Repository<Review>,
    entityManager: EntityManager,
  ) {
    super(reviewRepository, entityManager);
  }

  async findOneOrNull(where: FindOptionsWhere<Review>): Promise<Review | null> {
    return this.entityRepository.findOne({ where });
  }

  async findPaginatedBySession(
    sessionId: string,
    page: number,
    limit: number,
    minRating?: number,
  ): Promise<{ data: Review[]; total: number }> {
    const qb = this.entityRepository
      .createQueryBuilder('review')
      .where('review.sessionId = :sessionId', { sessionId });

    if (minRating !== undefined) {
      qb.andWhere('review.rating >= :minRating', { minRating });
    }

    qb.orderBy('review.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async getAverageRating(sessionId: string): Promise<number> {
    const result = await this.entityRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'avg')
      .where('review.sessionId = :sessionId', { sessionId })
      .getRawOne();
    return result?.avg ? parseFloat(parseFloat(result.avg).toFixed(2)) : 0;
  }
}
