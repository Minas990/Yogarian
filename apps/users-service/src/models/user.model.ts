import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Follow } from "./follow.model";
import { AbstractEntity } from "@app/database/database.entity";
@Entity()
export class User extends AbstractEntity<User>
{
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
    
    @Column({ type: 'uuid', primary: true })
    userId: string; 

    constructor(entity? : Partial<User>) {
        super();
        Object.assign(this, entity);
    }
}