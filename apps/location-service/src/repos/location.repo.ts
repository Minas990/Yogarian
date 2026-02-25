import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { Location } from "../models/location.model";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LocationRepo extends AbstractRepository<Location>
{
    constructor(@InjectRepository(Location) userLocationRepository: Repository<Location>, entityManager: EntityManager)
    {
        super(userLocationRepository, entityManager);
    }

}
