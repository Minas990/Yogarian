import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Follow } from "./follow.model";
import { AbstractEntity } from "@app/database/database.entity";
@Entity()
export class User extends AbstractEntity<User>
{
    @PrimaryGeneratedColumn()
    id: number;
    //we dont need to make it unique 
    //the truth source here is authentication service
    @Column({unique:true})
    email:string;
    @Column()
    name:string;
    @OneToMany(() => Follow, follow => follow.following)
    followers: Follow[];
    @OneToMany(() => Follow, follow => follow.follower)
    following: Follow[];

    //the userId is a uuid that will be used for authentication and as a reference in other services while the id from AbstractEntity is an auto-incremented integer used as the primary key in the database
    //that will be transered to user 
    @Column({ type: 'uuid', unique: true })
    userId: string; 

    constructor(entity? : Partial<User>) {
        super();
        Object.assign(this, entity);
    }
}