import { AbstractRepository } from "@app/database/database,repository";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, FindOptionsWhere, LessThan, Repository } from "typeorm";
import { AuthUser } from "../models/auth-user.model";


export class AuthUserRepository extends AbstractRepository<AuthUser>
{
    constructor(@InjectRepository(AuthUser) authUserRepository: Repository<AuthUser>, entityManager: EntityManager)
    {
        super(authUserRepository, entityManager);
    }

    async findWithOptions(where: FindOptionsWhere<AuthUser>, options?: { order?: any; take?: number; skip?: number })
    {
        return this.entityRepository.find({
            where,
            ...options,
        });
    }
}