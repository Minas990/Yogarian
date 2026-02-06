import {  EntityManager, Repository } from "typeorm";
import { Follow } from "../models/follow.model";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";

export class FollowRepository extends AbstractRepository<Follow>
{
    constructor(@InjectRepository(Follow) followRepository: Repository<Follow>, entityManager: EntityManager)
    {
        super(followRepository, entityManager);
    }
}