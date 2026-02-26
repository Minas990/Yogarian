import { Column, Entity, type Geometry, Index, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User.entity";
import { SessionStatus } from "@app/common/types/sessions-status.type";
import { Reservation } from "./reservations.model";
import { Photo } from "./photos.model";



@Entity()

@Index('idx_session_user', ['userId'])
@Index('idx_session_status', ['status'])
@Index('idx_session_startTime', ['startTime'])
@Index('idx_session_price', ['price'])
@Index('idx_session_maxParticipants', ['maxParticipants'])
@Index('idx_session_duation', ['duration'])
@Index('idx_session_governorate', ['governorate'])
@Index('idx_session_createdAt_sessionId', ['createdAt', 'sessionId'])
export class Session 
{
    @PrimaryColumn('uuid')
    sessionId: string;
    @JoinColumn({name:'userId'})
    @ManyToOne(() => User, user => user.userId, { onDelete: 'NO ACTION',eager:false }) // there will be an event called when a user is deleted and this event will call delete session event to delete all sessions of the user
    user : User;
    @Column('uuid')
    userId: string;//the fk of the user who created the session

    @Column()
    address: string;
    @Column()
    governorate: string;
    @Column()
    longitude: string
    @Column()
    latitude: string
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
    point: Geometry; 
    @OneToMany(() => Reservation, reservation => reservation.sessionId,{eager:false})
    reservations: Reservation[];
    @Column()
    createdAt: Date;

    @OneToMany(() => Photo, photo => photo.session,{eager:true})
    photos: Photo[];
    
    constructor(entity?: Partial<Session>) {
        Object.assign(this, entity);
    }
}