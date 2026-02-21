import { OwnerType } from "@app/common/types/owners.types";
import { AbstractEntity } from "@app/database/database.entity";
import { Column, Entity,  Index,  PrimaryGeneratedColumn } from "typeorm";
import { PhotoStatus } from "../types/photo-status.type";

@Index(["ownerType", "OwnerId"])
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

    @Column({ type: 'enum', enum: OwnerType })
    ownerType: OwnerType;

    @Column({type:'uuid'})
    OwnerId: string;
    
    @Column({type:'enum',enum:PhotoStatus,default:PhotoStatus.PENDING})
    status: PhotoStatus;

    constructor(entity?: Partial<Photo>) {
        super();
        Object.assign(this, entity);
    }
}
