import {  EntityManager, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { AbstractRepository } from "@app/database/database,repository";
import { Photo } from "../models/photo.model";

export class PhotoRepository extends AbstractRepository<Photo>
{
    constructor(@InjectRepository(Photo) photoRepository: Repository<Photo>, entityManager: EntityManager)
    {
        super(photoRepository, entityManager);
    }
}