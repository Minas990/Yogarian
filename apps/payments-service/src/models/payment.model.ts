import { PaymentStatus } from "@app/common/types/payment-status.type";
import { Column, Entity, In, Index, PrimaryColumn } from "typeorm";


@Entity()
@Index("idx_payment_status", ["status"])
@Index("idx_payment_checkout_id", ["stripe_checkout_session_id"])
export class PaymentEntity 
{
    @Column('uuid',{unique:true})
    requestId: string;
    @PrimaryColumn('uuid')
    userId: string
    @PrimaryColumn('uuid')
    sessionId: string
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;

    @Column({type:'enum',enum:PaymentStatus,default:PaymentStatus.INITIATED})
    status: PaymentStatus
    @Column({nullable:true,unique:true})
    stripe_checkout_session_id: string;
    @Column({nullable:true})
    checkout_url: string;//stripe checkout url
    @Column({nullable:true,unique:true})
    payment_intent_id: string;//stripe payment intent id


    @Column({nullable:true,type:'json'})
    failure_reason : any;//if payment failed, the reason will be stored here
    
    @Column({nullable:true,unique:true})
    refund_id: string;//stripe refund id if refunded
    @Column({nullable:true})
    refund_reason: string;//reason for refund if refunded
    @Column({nullable:true})
    refundAt: Date;//refund date if refunded
    @Column({
        type: 'timestamp',
        default: () => 'CURRENT_TIMESTAMP',
    })
    createdAt: Date;

}