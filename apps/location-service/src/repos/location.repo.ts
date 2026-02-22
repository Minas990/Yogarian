import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { Location } from "../models/location.model";
import { Injectable } from "@nestjs/common";
import { OwnerType } from "@app/common/types/owners.types";

@Injectable()
export class LocationRepo extends AbstractRepository<Location>
{
    constructor(@InjectRepository(Location) userLocationRepository: Repository<Location>, entityManager: EntityManager)
    {
        super(userLocationRepository, entityManager);
    }

async findNearestSessionsId(
    latitude: number,
    longitude: number,
    radius: number,   //meters
    page: number,
    limit: number,
) {
    const qb = this.entityRepository.createQueryBuilder('ul');

    const userPoint = `
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
    `;
    qb.select([
        'ul.id',
        'ul.ownerId',
        'ul.ownerType',
        'ul.address',
        'ul.governorate',
        'ul.createdAt',
        `ST_AsGeoJSON(ul.point)::jsonb AS point`,
        `ST_Distance(ul.point, ${userPoint}) AS distance`
    ]);
    qb.where(
        `ST_DWithin(ul.point, ${userPoint}, :radius)`
    );
    qb.andWhere(
        'ul.ownerType = :ownerType',
        { ownerType: OwnerType.SESSION }
    );
    qb.setParameters({
        latitude,
        longitude,
        radius
    });
    // knn index ordering
    qb.orderBy(`ul.point <-> ${userPoint}`, 'ASC');
    qb.limit(limit)
      .offset((page - 1) * limit);
    return qb.getRawMany();
}

async findNearestUsers(latitude: number, longitude: number, radius: number, limit: number) 
{
    const qb = this.entityRepository.createQueryBuilder('ul');

    const sessionPoint = `
        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
    `;
    qb.select([
        'ul.ownerId',
    ]);
    qb.where(
        `ST_DWithin(ul.point, ${sessionPoint}, :radius)`
    ).andWhere(
        'ul.ownerType = :ownerType',
        { ownerType: OwnerType.USER }
    );
    qb.setParameters({
        latitude,
        longitude,
        radius
    });
    qb.orderBy(`ul.point <-> ${sessionPoint}`, 'ASC');
    qb.limit(limit);
    return qb.getRawMany();
}
}
