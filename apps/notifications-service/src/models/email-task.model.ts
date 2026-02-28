import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { NOTIFICATION_STATUS } from "../types/notification.type";
import { NotificationEvent } from "./event.model";


@Index('idx_email_task_status',['status','email'])
@Index('idx_email_task_priority_created',['priority','createdAt'])
@Entity('notification_email_tasks')
export class NotificationEmailTask {

    @PrimaryGeneratedColumn('uuid')
    id: string;

    @JoinColumn({ name: 'eventId' })
    @ManyToOne(() => NotificationEvent, { onDelete: 'CASCADE' })
    event: NotificationEvent;

    @Column()
    subject: string;

    @Column('uuid')
    userId: string;
    
    @Column()
    templateName: string;

    @Column()
    email: string;

    @Column('json')
    payload: any;

    @Column({
        type:'enum',
        enum: NOTIFICATION_STATUS,
        default: NOTIFICATION_STATUS.PENDING
    })
    status: NOTIFICATION_STATUS;

    @Column({ default: 0 })
    retryCount: number;

    @Column({ nullable: true })
    lastError: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column({ type: 'int', default: 0 })
    //{0: highest priority, larger number = lower priority}
    priority: number;

    @UpdateDateColumn()
    updatedAt: Date;
}