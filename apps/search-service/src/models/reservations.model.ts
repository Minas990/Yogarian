import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from "typeorm";
import { User } from "./User.entity";
import { Session } from "./session.model";
import { ReservationStatus } from "apps/reservations-service/src/types/reservation-status.type";

@Entity()
@Index('idx_reservation_user', ['userId'])
@Index('idx_reservation_session', ['sessionId'])
@Index('idx_reservation_price', ['locked_price'])
@Index('idx_startedAt', ['createdAt'])
export class Reservation {
    @ManyToOne(() => Session, session => session.reservations, { eager: true, onDelete: 'NO ACTION' })//soft 
    @JoinColumn({ name: 'sessionId' })
    session: Session;
    @PrimaryColumn('uuid')
    sessionId: string;
    @ManyToOne(() => User, user => user.reservations, { eager: false, onDelete: 'NO ACTION' })//there will be an event for that 
    @JoinColumn({ name: 'userId' })
    user: User;
    @PrimaryColumn('uuid')
    userId: string; //Fk column
    @Column()
    locked_price: number;
    @Column({ type: 'enum', enum: ReservationStatus })
    state: ReservationStatus;
    @Column()
    createdAt: Date
    constructor(entity?: Partial<Reservation>) {
        Object.assign(this, entity);
    }
}