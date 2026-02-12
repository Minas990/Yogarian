import { AbstractEntity } from '@app/database/database.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Session } from './session.model';

@Entity()
export class Photo extends AbstractEntity<Photo> {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Session, session => session.photos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: Session;

  @Column('uuid')
  sessionId: string;

  @Column()
  url: string;

  @Column()
  public_id: string;

  @Column({ nullable: true })
  filename: string;

  @Column({ nullable: true })
  mimetype: string;

  constructor(entity?: Partial<Photo>) {
    super();
    Object.assign(this, entity);
  }
}
