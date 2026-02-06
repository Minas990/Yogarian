import { AbstractRepository } from "@app/database/database,repository";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { AuthUser } from "../models/auth-user.model";


export class AuthUserRepository extends AbstractRepository<AuthUser>
{
    constructor(@InjectRepository(AuthUser) authUserRepository: Repository<AuthUser>, entityManager: EntityManager)
    {
        super(authUserRepository, entityManager);
    }
}