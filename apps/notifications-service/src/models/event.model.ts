import { KAFKA_TOPICS,type KafkaTopics } from "@app/kafka";
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { NotificationEmailTask } from "./email-task.model";



@Entity('notification_events') //only for preventing double events, not for storing data
export class NotificationEvent
{
    @PrimaryColumn()
    eventId: string;

    @CreateDateColumn()
    createdAt: Date;

    @Column('json') 
    payload: any;

    @Column({
        type:'enum',
        enum: Object.values(KAFKA_TOPICS)
    })
    eventType: KafkaTopics;

    @Column()
    emitter: string;

    @OneToMany(() => NotificationEmailTask, emailTask => emailTask.event,{eager:false})
    emailTasks: NotificationEmailTask[];
}