import { Column, CreateDateColumn, Entity, Index, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Follow } from "./follow.model";
import { AbstractEntity } from "@app/database/database.entity";
import { Photo } from "./photo.model";

@Entity()
export class User extends AbstractEntity<User>
{
    @PrimaryGeneratedColumn()
    id: number;
    //we dont need to make unique 
    //the truth source here is authentication service
    @Column()
    email:string;
    @Column()
    name:string;
    @OneToMany(() => Follow, follow => follow.following)
    followers: Follow[];
    @OneToMany(() => Follow, follow => follow.follower)
    following: Follow[];
    
    @OneToOne(() => Photo, photo => photo.user, {cascade:true,eager:true})
    photo: Photo;

    //the userId is a uuid that will be used for authentication and as a reference in other services while the id from AbstractEntity is an auto-incremented integer used as the primary key in the database
    //that will be transered to user 
    @Column({ type: 'uuid', unique: true })
    userId: string; 

    constructor(entity? : Partial<User>) {
        super();
        Object.assign(this, entity);
    }
}