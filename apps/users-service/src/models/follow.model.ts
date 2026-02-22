import { AbstractEntity } from "@app/database/database.entity";
import { Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.model";

@Entity()
@Index("IDX_FOLLOWING_FOLLOWER", ["followingId", "followerId"]) //typeorm doesnt support covering indexes naively
@Index("IDX_FOLLOWER_FOLLOWING", ["followerId", "followingId"]) 
export class Follow extends AbstractEntity<Follow> {
    @PrimaryColumn({ name: 'followerId' })
    followerId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followerId' })
    follower: User;

    @PrimaryColumn({ name: 'followingId' })
    followingId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followingId' })
    following: User;

    constructor(entity?: Partial<Follow>) {
        super();
        Object.assign(this, entity);
    }
}
