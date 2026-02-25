import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "./User.entity";

@Entity()
export class Follow 
{
    @PrimaryColumn('uuid')
    followerId: string;
    @PrimaryColumn('uuid')
    followingId: string;
    @JoinColumn({name: 'followerId'})
    @ManyToOne(() => User, user => user.following)
    follower: User
    @JoinColumn({name: 'followingId'})
    @ManyToOne(() => User, user => user.followers)
    following: User
    @Column()
    createdAt: Date;

    constructor(entity?: Partial<Follow>) {
        Object.assign(this, entity);
    }
}