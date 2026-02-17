import { OwnerType } from "@app/common/types/owners.types";
import { AbstractEntity } from "@app/database/database.entity";
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";

export interface Geometry {
    type: "Point"
    coordinates: [number, number] // [longitude, latitude]
}

@Index(["ownerType", "ownerId"])

@Entity()
export class UserLocation extends AbstractEntity<UserLocation> 
{
    @PrimaryGeneratedColumn()
    id:number;
    @Column({type:'uuid'})
    ownerId: string;
    @Column({type:'enum',enum:OwnerType})
    ownerType: OwnerType;

    @Column({nullable:true})
    address: string;

    @Column({nullable:true})
    governorate: string;

    @Column("geometry", {
        spatialFeatureType: "Point",
        srid: 4326,
        nullable: true,
    })
    @Index({ spatial: true })
    point: Geometry //latitude and longitude , first is longitude then latitude: idk why i always get it wrong :)
    
    constructor(entity?: Partial<UserLocation>) {
        super();
        Object.assign(this, entity);
    }
}
