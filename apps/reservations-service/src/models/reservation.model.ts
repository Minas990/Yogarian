import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";
import { ReservationStatus } from "../types/reservation-status.type";

@Entity()
@Index("session_idx", ["sessionId"])
@Index("user_idx", ["userId"])
export class Reservation
{
    @PrimaryColumn('uuid')
    userId: string;
    @PrimaryColumn('uuid')
    sessionId: string;
    
    @Column({type:"enum",enum:ReservationStatus,default:ReservationStatus.PENDING})
    status: ReservationStatus;

    @Column()
    locked_price: number;//the price at the momeent of reservation creation

    @Column()
    start_time: Date; // will be updated if the session is rescheduled

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({nullable:true})
    paymednt_intent_id: string;

    constructor(entity?: Partial<Reservation>) {
        Object.assign(this, entity);
    }
}