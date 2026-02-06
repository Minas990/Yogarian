import {
    Entity,
    PrimaryGeneratedColumn,
    ManyToOne,
    JoinColumn,
    Unique,
    Index,
    Column
} from "typeorm";
import { User } from "./user.model";
import { AbstractEntity } from "@app/database/database.entity";

@Entity()
@Unique(['followingId', 'followerId'])
export class Follow  extends AbstractEntity<Follow>
{

    @Index()
    @Column({ name: 'followingId' })
    followingId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followingId' })
    following: User;

    @Index()
    @Column({ name: 'followerId' })
    followerId: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'followerId' })
    follower: User;

    constructor(entity? : Partial<Follow>) {
        super();
        Object.assign(this, entity);
    }
}
