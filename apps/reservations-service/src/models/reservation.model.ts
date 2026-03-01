import { ReservationStatus } from "@app/common/types/reservation-status.type";
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity()
@Index("session_idx", ["sessionId"])
@Index("user_idx", ["userId"])
@Index("request_status_idx", ["requestId","status"])
export class Reservation 
{
    @Column('uuid',{unique:true})
    requestId: string; //will be used for polling

    @PrimaryColumn('uuid')
    userId: string;
    @PrimaryColumn('uuid')
    sessionId: string;
    
    @Column({type:"enum",enum:ReservationStatus,default:ReservationStatus.PENDING_VALIDATION})
    status: ReservationStatus;

    @Column({nullable:true})
    locked_price: number;//the price at the momeent of reservation creation
    
    @Column({nullable:true})
    payment_intent_id: string;

    @Column({nullable:true})
    checkout_url: string;//stripe checkout url

    @Column({nullable:true,type:'json'})
    failure_reason : any;//if reservation failed, the reason will be stored here

    @Column({nullable:true})
    expires_at: Date;//when the reservation will expire if not confirmed

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    constructor(entity?: Partial<Reservation>) {
        Object.assign(this, entity);
    }
}