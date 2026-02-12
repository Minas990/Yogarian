import { Injectable, BadRequestException, NotFoundException, Inject, OnModuleInit } from '@nestjs/common';
import { ReviewsRepository } from '../repos/reviews.repo';
import { SessionsRepository } from '../repos/sessions.repo';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { Review } from '../models/review.model';
import { GetReviewsQuery } from '../types/get-reviews.type';
import { PaginatedResponse } from '../types/paginated-response.type';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE } from '@app/kafka';
import { AppLoggerService } from '@app/common';

@Injectable()
export class ReviewsService implements OnModuleInit {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly sessionsRepository: SessionsRepository,
    @Inject(KAFKA_SERVICE) private readonly kafka: ClientKafka,
    private readonly appLogger: AppLoggerService,
  ) {}

  async onModuleInit() {
    await this.kafka.connect();
  }

  async create(sessionId: string, createReviewDto: CreateReviewDto, userId: string): Promise<Review> {
    try {
      const session = await this.sessionsRepository.findOneOrNull({ id: sessionId } as any);
      if (!session) {
        throw new NotFoundException(`Session with id ${sessionId} not found`);
      }

      const existingReview = await this.reviewsRepository.findOneOrNull({ sessionId, userId } as any);
      if (existingReview) {
        throw new BadRequestException('You have already reviewed this session');
      }

      const review = new Review({
        ...createReviewDto,
        sessionId,
        userId,
      });

      const result = await this.reviewsRepository.create(review);

      this.appLogger.logInfo({
        functionName: 'create',
        message: `Review created for session ${sessionId} by user ${userId}`,
        userId,
        additionalData: { sessionId, reviewId: result.id, rating: result.rating },
      });

      this.kafka.emit('review.created', {
        reviewId: result.id,
        sessionId,
        userId,
        rating: result.rating,
      });

      return result;
    } catch (error) {
      this.appLogger.logError({
        functionName: 'create',
        problem: 'Failed to create review',
        error,
        additionalData: { sessionId, userId },
      });
      throw error;
    }
  }

  async findBySessionId(
    sessionId: string,
    query: GetReviewsQuery,
  ): Promise<PaginatedResponse<Review> & { averageRating: number }> {
    const session = await this.sessionsRepository.findOneOrNull({ id: sessionId } as any);
    if (!session) {
      throw new NotFoundException(`Session with id ${sessionId} not found`);
    }

    const { page = 1, limit = 10, minRating } = query;
    const { data, total } = await this.reviewsRepository.findPaginatedBySession(sessionId, page, limit, minRating);
    const averageRating = await this.reviewsRepository.getAverageRating(sessionId);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      averageRating,
    };
  }

  async findById(id: string): Promise<Review> {
    const review = await this.reviewsRepository.findOneOrNull({ id } as any);
    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }
    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, userId: string): Promise<Review> {
    try {
      const review = await this.findById(id);

      if (review.userId !== userId) {
        throw new BadRequestException('You can only update your own reviews');
      }

      const updated = await this.reviewsRepository.findOneAndUpdate({ id } as any, updateReviewDto);

      this.appLogger.logInfo({
        functionName: 'update',
        message: `Review updated: ${id} by user ${userId}`,
        userId,
        additionalData: { reviewId: id, sessionId: review.sessionId },
      });

      this.kafka.emit('review.updated', {
        reviewId: id,
        sessionId: review.sessionId,
        userId,
        rating: updated.rating,
      });

      return updated;
    } catch (error) {
      this.appLogger.logError({
        functionName: 'update',
        problem: 'Failed to update review',
        error,
        additionalData: { reviewId: id, userId },
      });
      throw error;
    }
  }

  async delete(id: string, userId: string): Promise<{ message: string }> {
    try {
      const review = await this.findById(id);

      if (review.userId !== userId) {
        throw new BadRequestException('You can only delete your own reviews');
      }

      await this.reviewsRepository.remove(review);

      this.appLogger.logInfo({
        functionName: 'delete',
        message: `Review deleted: ${id} by user ${userId}`,
        userId,
        additionalData: { reviewId: id, sessionId: review.sessionId },
      });

      this.kafka.emit('review.deleted', {
        reviewId: id,
        sessionId: review.sessionId,
        userId,
      });

      return { message: 'Review deleted successfully' };
    } catch (error) {
      this.appLogger.logError({
        functionName: 'delete',
        problem: 'Failed to delete review',
        error,
        additionalData: { reviewId: id, userId },
      });
      throw error;
    }
  }
}
