
import { Column } from "typeorm";

export  class AbstractEntity<T>
{
    @Column({default: () => 'CURRENT_TIMESTAMP'})
    createdAt: Date;
    constructor()
    {
        
    }
}