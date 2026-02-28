import { AbstractEntity } from '@app/database/database.entity';
import {  Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { SessionStatus } from '../../../../libs/common/src/types/sessions-status.type';

@Entity()
@Index('idx_session_trainer', ['trainerId'])
@Index('idx_session_price', ['price'])
@Index('idx_session_startTime', ['startTime'])
@Index('idx_session_status_startTime', ['status', 'startTime'])
export class Session extends AbstractEntity<Session> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('uuid')
  trainerId: string; 

  @Column()
  maxParticipants: number;

  @Column({ default: 0 })
  currentParticipants: number;

  @Column({
    name: 'startTime',
    type: 'timestamp',
  })
  startTime: Date;

  @Column()
  duration: number; // in minutes

  @Column({ type: 'float', default: 0 })
  price: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.UPCOMING,
  })
  status: SessionStatus;
  
  constructor(entity?: Partial<Session>) {
    super();
    Object.assign(this, entity);
  }
}
