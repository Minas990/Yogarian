import { AbstractEntity } from "@app/database/database.entity";
import { Column, CreateDateColumn, Entity } from "typeorm";

@Entity()
export class Photo extends AbstractEntity<Photo> {
    @Column()
    url: string;

    @Column()
    public_id: string;

    @Column({ nullable: true })
    filename: string;

    @Column({ nullable: true })
    mimetype: string;

    
    @CreateDateColumn()
    createdAt: Date;
    constructor(entity?: Partial<Photo>) {
        super();
        Object.assign(this, entity);
    }
}
