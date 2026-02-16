import { AbstractEntity } from "@app/database/database.entity";
import { Column, Entity, Index, JoinColumn, OneToOne, PrimaryColumn } from "typeorm";
import { User } from "../../../users-service/src/models/user.model";


export interface Geometry {
    type: "Point"
    coordinates: [number, number] // [longitude, latitude]
}


@Entity()
export class UserLocation extends AbstractEntity<UserLocation> {


    @PrimaryColumn()
    userId: string;

    @OneToOne(() => User, (user) => user.location, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId', referencedColumnName: 'userId' }) //email change be changed so i cannot reference it by email
    user: User;
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
