
import { CreateDateColumn, PrimaryGeneratedColumn } from "typeorm";

export  class AbstractEntity<T>
{
    @CreateDateColumn()
    createdAt: Date;
    constructor()
    {
        
    }
}