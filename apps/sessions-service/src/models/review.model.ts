import { AbstractEntity } from '@app/database/database.entity';
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Session } from './session.model';

@Entity()
export class Review extends AbstractEntity<Review> {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  sessionId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int', default: 0 })
  rating: number; //1-5 stars

  @Column({ type: 'text', nullable: true })
  comment: string;

  @ManyToOne(() => Session, session => session.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  constructor(entity?: Partial<Review>) {
    super();
    Object.assign(this, entity);
  }
}
