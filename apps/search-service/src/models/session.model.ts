import { Column, Entity, Index, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User.entity";
import { SessionStatus } from "apps/sessions-service/src/types/sessions-status.type";
import { type Geometry } from "@app/common";
import { Reservation } from "./reservations.model";



@Entity()

@Index('idx_session_user', ['userId'])
@Index('idx_session_status', ['status'])
@Index('idx_session_startTime', ['startTime'])
@Index('idx_session_price', ['price'])
export class Session 
{
    @PrimaryColumn('uuid')
    sessionId: string;
    @Column('uuid')
    @JoinColumn({name:'userId'})
    @ManyToOne(() => User, user => user.userId, { onDelete: 'CASCADE',eager:false })
    user : User;
    @Column('uuid')
    userId: string;//the fk to the user who created the session

    @Column()
    address: string;
    @Column()
    longitude: number
    @Column()
    latitude: number
    @Column()
    title: string;
    @Column()
    description: string;
    @Column()
    startTime: Date;
    @Column()
    duration: number; // in minutes
    @Column()
    currentParticipants: number;
    @Column()
    maxParticipants: number;
    @Column()
    price: number;
    @Column()
    notes: string;
    @Column({type:'enum',enum: SessionStatus})
    status: SessionStatus;
    @Column("geography",{spatialFeatureType:"Point",srid:4326})
    @Index({ spatial: true })
    point: Geometry
    @OneToMany(() => Reservation, reservation => reservation.sessionId,{eager:false})
    reservations: Reservation[];
    @Column()
    createdAt: Date;

    @Column({nullable:true})
    imageUrl1: string;
    @Column({nullable:true})
    imageUrl2: string
    @Column({nullable:true})
    imageUrl3: string
    
    constructor(entity?: Partial<Session>) {
        Object.assign(this, entity);
    }
}