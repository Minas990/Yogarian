import { Abstract, NotFoundException } from "@nestjs/common";
import { EntityManager, FindOptionsRelations, FindOptionsWhere, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity.js";
import { AbstractEntity } from "./database.entity";



export class AbstractRepository<T extends AbstractEntity<T>> 
{
    constructor(
        protected readonly   entityRepository: Repository<T>,
        protected readonly entityManager:EntityManager
    )
    {

    }
    
    async create(entity:T): Promise<T>
    {
        return this.entityManager.save(entity);
    }

    async findOne(where: FindOptionsWhere<T> ,relations?:FindOptionsRelations<T>) 
    {
        const entity = await this.entityRepository.findOne({where,relations});
        if(!entity) throw new NotFoundException('no such entity found');
        return entity;
    }

    async findOneAndUpdate(where: FindOptionsWhere<T> , partialEntity: QueryDeepPartialEntity<T>)
    {
        const entity = await this.entityRepository.update(where, partialEntity);
        if(entity.affected === 0) throw new NotFoundException('no such entity found');
        return this.findOne(where);
    }

    async find(where : FindOptionsWhere<T> )
    {
        const entities = await this.entityRepository.findBy(where);
        return entities;
    }

        async findOneAndDelete(where: FindOptionsWhere<T>)
    {
        const entity = await this.entityRepository.delete(where);
        if(entity.affected==0)
        {
            throw new NotFoundException('no such entity');
        }
        return entity;
    }

    async remove(entity: T)
    {
        return this.entityManager.remove(entity);
    }
}