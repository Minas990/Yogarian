
import { Column } from "typeorm";

export  class AbstractEntity<T>
{
    @Column()
    createdAt: Date;
    constructor()
    {
        
    }
}