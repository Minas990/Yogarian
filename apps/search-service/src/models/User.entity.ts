import { Roles } from "@app/common";
import { Column, Entity, type Geometry, Index, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { Session } from "./session.model";
import { Reservation } from "./reservations.model";
import { Follow } from "./follow.model";

@Entity()
@Index('idx_user_email', ['email'])
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
    @Column({nullable:true})
    address: string;
    @Column({nullable:true})
    governorate: string;
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
    point: Geometry;

    @OneToMany(() => Session, session => session.userId,{eager:false})
    sessions: Session[];

    @OneToMany(() => Reservation, reservation => reservation.userId,{eager:false})
    reservations: Reservation[];

    @OneToMany(() => Follow, follow => follow.following,{eager:false})
    followers: User[];
    @OneToMany(() => Follow, follow => follow.follower,{eager:false})
    following: User[];
    @Column()
    createdAt: Date;
    
    constructor(entity?: Partial<User>) {
        Object.assign(this, entity);
    }
}