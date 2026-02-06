import { AbstractEntity } from "@app/database/database.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.model";

@Entity()
export class Photo extends AbstractEntity<Photo> {

    @PrimaryGeneratedColumn()
    id:number;

    @OneToOne(() => User, user => user.photo, {onDelete:'CASCADE'})
    @JoinColumn()
    user: User;
    @Column()
    url: string;

    @Column()
    public_id: string;

    @Column({ nullable: true })
    filename: string;

    @Column({ nullable: true })
    mimetype: string;

    
    constructor(entity?: Partial<Photo>) {
        super();
        Object.assign(this, entity);
    }
}
