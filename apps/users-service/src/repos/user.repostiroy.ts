import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { User } from "../models/user.model";

export class UserRepository extends AbstractRepository<User>
{
    constructor(@InjectRepository(User) userRepository: Repository<User>, entityManager: EntityManager)
    {
        super(userRepository, entityManager);
    }
}