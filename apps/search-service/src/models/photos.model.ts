import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Session } from "./session.model";


@Index('idx_photo_session', ['sessionId','url'])//i dont see any implementation of including index  in typeorm , so i decided to make the index composite on sessionId and url to optimize the search for photos of a session
@Entity()
export class Photo 
{
    @PrimaryColumn()
    id: number;

    @Column()
    url: string;

    @ManyToOne(() => Session, session => session.photos, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sessionId' })
    session: Session;
    @Column()
    sessionId: string;
}