import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { UserLocation } from "../models/location.model";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LocationRepo extends AbstractRepository<UserLocation>
{
    constructor(@InjectRepository(UserLocation) userLocationRepository: Repository<UserLocation>, entityManager: EntityManager)
    {
        super(userLocationRepository, entityManager);
    }

    async findNearestUsers(latitude: number, longitude: number): Promise<string[]>
    {
        const qb = this.entityRepository.createQueryBuilder('location');
        qb.innerJoin('location.user', 'user');
        qb.select('user.email', 'email');
        qb.where(`ST_DWithin(location.point, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326), 10000)`, {latitude, longitude});
        qb.orderBy(`ST_Distance(location.point, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326))`, 'ASC');
        qb.limit(30);
        const results = await qb.getRawMany<{ email: string }>();
        return results.map(r => r.email);
    }
}