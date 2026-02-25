import { Column, Entity, type Geometry, Index, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User.entity";
import { SessionStatus } from "apps/sessions-service/src/types/sessions-status.type";
import { Reservation } from "./reservations.model";
import { Photo } from "./photos.model";



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
    governorate: string;
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