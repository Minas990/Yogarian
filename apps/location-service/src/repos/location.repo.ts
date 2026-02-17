import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { UserLocation } from "../models/location.model";
import { Injectable } from "@nestjs/common";
import { OwnerType } from "@app/common/types/owners.types";

@Injectable()
export class LocationRepo extends AbstractRepository<UserLocation>
{
    constructor(@InjectRepository(UserLocation) userLocationRepository: Repository<UserLocation>, entityManager: EntityManager)
    {
        super(userLocationRepository, entityManager);
    }

    async findNearestSessionsId(latitude: number, longitude: number, radius: number, page: number, limit: number)
    {
        const qb = this.entityRepository.createQueryBuilder('UserLocation');
        qb.select([
            '"UserLocation"."id"',
            '"UserLocation"."ownerId"',
            '"UserLocation"."ownerType"',
            '"UserLocation"."address"',
            '"UserLocation"."governorate"',
            '"UserLocation"."createdAt"',
            `ST_AsGeoJSON("UserLocation"."point")::jsonb as point`
        ].join(', '));
        qb.where(
            `ST_DWithin("UserLocation"."point"::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography, :radius)`,
            { latitude, longitude, radius }
        ).andWhere('"UserLocation"."ownerType" = :ownerType', { ownerType: OwnerType.SESSION });
        qb.orderBy(
            `ST_Distance("UserLocation"."point"::geography, ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography)`,
            'ASC'
        );
        qb.limit(limit).offset((page - 1) * limit);
        const results = await qb.getRawMany<UserLocation>();
        return results;
    }
}