import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EventSubscriber, EntitySubscriberInterface, InsertEvent, UpdateEvent } from 'typeorm';
import { Session } from '../models/session.model';

@EventSubscriber()
@Injectable()
export class SessionSubscriber implements EntitySubscriberInterface<Session> {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  listenTo() {
    return Session;
  }

  async afterInsert(event: InsertEvent<Session>): Promise<void> {
    await this.syncGeo(event.entity);
  }

  async afterUpdate(event: UpdateEvent<Session>): Promise<void> {
    const entity = event.entity as Session;
    if (entity?.latitude !== undefined && entity?.longitude !== undefined) {
      await this.syncGeo(entity);
    }
  }

  private async syncGeo(entity: Session): Promise<void> {
    if (entity?.latitude == null || entity?.longitude == null || !entity?.id) return;
    await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ geo: () => `ST_SetSRID(ST_MakePoint(${entity.longitude}, ${entity.latitude}), 4326)` })
      .where('id = :id', { id: entity.id })
      .execute();
  }
}
