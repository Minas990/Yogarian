import { AbstractEntity } from "@app/database/database.entity";
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Photo extends AbstractEntity<Photo> {

    @PrimaryGeneratedColumn()
    id:number;
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
