import { AbstractEntity } from '@app/database/database.entity';
import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Photo } from './photo.model';
import { Review } from './review.model';

@Entity()
@Index('idx_session_trainer', ['trainerId'])
@Index('idx_session_price', ['price'])
@Index('idx_session_start_time', ['startTime'])
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
    type: 'timestamp',
  })
  startTime: Date;

  @Column({
    type: 'timestamp',
  })
  endTime: Date;

  @Column()
  location: string;

  @Column('decimal', { precision: 10, scale: 8 })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude: number;

  @Index({ spatial: true })
  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geo: object;

  @Column({ type: 'float', default: 0 })
  price: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
  
  @OneToMany(() => Photo, photo => photo.session, { cascade: true, eager: false })
  photos: Photo[];

  @OneToMany(() => Review, review => review.session, { cascade: true })
  reviews: Review[];

  constructor(entity?: Partial<Session>) {
    super();
    Object.assign(this, entity);
  }
}
