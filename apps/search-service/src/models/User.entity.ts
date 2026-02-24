import { type Geometry, Roles } from "@app/common";
import { Column, Entity, Index, OneToMany, PrimaryColumn } from "typeorm";
import { Session } from "./session.model";
import { Reservation } from "./reservations.model";

@Entity()
@Index('idx_user_email', ['email'])
@Index('idx_user_confirmed_email', ['isEmailConfirmed','createdAt'])
export class User 
{
    @PrimaryColumn('uuid')
    userId: string;
    @Column()
    email: string;
    @Column({nullable:true})
    name: string
    @Column({type:'enum', enum: Roles})
    role: Roles;
    @Column({type:'boolean'})
    isEmailConfirmed: boolean;
    @Column({nullable:true})
    address: string;
    @Column({nullable:true})
    phoneNumber: string;
    @Column({nullable:true})
    longitude: number;
    @Column({nullable:true})
    latitude: number;
    @Column({nullable:true})
    profilePictureUrl: string;
    @Column("geography",{nullable:true,spatialFeatureType:"Point",srid:4326})
    @Index({ spatial: true })
    point: Geometry

    @OneToMany(() => Session, session => session.userId,{eager:false})
    sessions: Session[];

    @OneToMany(() => Reservation, reservation => reservation.userId,{eager:false})
    reservations: Reservation[];

    @Column()
    createdAt: Date;
    
    constructor(entity?: Partial<User>) {
        Object.assign(this, entity);
    }
}