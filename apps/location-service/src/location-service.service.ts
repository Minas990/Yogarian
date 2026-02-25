import { AppLoggerService } from "@app/common";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { LocationRepo } from "./repos/location.repo";
import { CreateLocationDto } from "./dto/create-location.dto";
import {  Location } from "./models/location.model";
import { OwnerType } from "@app/common/types/owners.types";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { CreateLocationRequest, CreateLocationResponse, UpdateLocationRequest, UpdateLocationResponse } from "@app/common/generated/location";
import { LocationUserEvent } from "@app/common/events/location-user.event";
import { Geometry } from "typeorm";

@Injectable()
export class LocationService implements OnModuleInit {
    constructor(@Inject(KAFKA_SERVICE) private readonly kafkaService: ClientKafka , private readonly logger: AppLoggerService,
    private readonly locationRepo: LocationRepo) {}

    async onModuleInit() 
    {
        await this.kafkaService.connect();
    }

    async getUserLocation(userId: string)
    {
        return  this.locationRepo.findOne({ownerId: userId, ownerType: OwnerType.USER});
    }

    async createLocation(userId: string, dto: CreateLocationDto): Promise<Location> 
    {
        const location = new Location({
            ownerId: userId,
            ownerType: OwnerType.USER,
            address: dto.address,
            governorate: dto.governorate,
            point: {
                type: 'Point',
                coordinates: [dto.longitude, dto.latitude]
            }
        });
        this.kafkaService.emit(KAFKA_TOPICS.LOCATION_USER_CREATED, new LocationUserEvent({userId,...dto}))
        return this.locationRepo.create(location);
    }

    async updateLocation(userId: string, dto: UpdateLocationDto){
        const location = await this.getUserLocation(userId);
        let point:Geometry | undefined = undefined;
        if(dto.latitude && dto.longitude)//[0,0] is not valid for my case
            point = {
                type: 'Point',
                coordinates: [dto.longitude, dto.latitude]
            };
        return this.locationRepo.findOneAndUpdate({
            ownerId: userId,
            ownerType:OwnerType.USER
        },{
            ...dto,
            point
        });
    }

    async deleteLocation(userId: string) {
        return this.locationRepo.findOneAndDelete({
            ownerId: userId,
            ownerType: OwnerType.USER
        });
    }

    async getSessionLocation(sessionId: string) {
        return this.locationRepo.findOne({ownerId:sessionId,ownerType: OwnerType.SESSION});
    }

    async handleUserDeleted(userId: string) {
        this.logger.logInfo({
            functionName: 'handleUserDeleted',
            message: `Handling user deleted event for userId: ${userId}`
        });
        try 
        {
            await this.locationRepo.findOneAndDelete({ownerId: userId, ownerType: OwnerType.USER});
        }
        catch(error)
        {
            this.logger.logError({
                functionName: 'handleUserDeleted',
                problem: `Error handling user deleted event for userId: ${userId}: ${error.message}`,
                error
            });
        }
    }

    async handleSessionCreated(createLocation: CreateLocationRequest)//for grpc call
    {
        const location = new Location({
            ownerId: createLocation.ownerId,
            ownerType: OwnerType.SESSION,
            address: createLocation.address,
            governorate: createLocation.governorate,
            point: {
                type: 'Point',
                coordinates: [createLocation.longitude, createLocation.latitude]
            },
            createdAt: new Date(createLocation.createdAt)
        })
        const result = await this.locationRepo.create(location);
        return {   
            address: result.address,
            governorate: result.governorate,
            latitude: createLocation.latitude,
            longitude: createLocation.longitude,
        }
    }
    async handleSessionDeleted(sessionId: string) {
        this.logger.logInfo({
            functionName: 'handleSessionDeleted',
            message: `Deleting location for session: ${sessionId}`
        });

        try {
            await this.locationRepo.findOneAndDelete({
                ownerId: sessionId,
                ownerType: OwnerType.SESSION
            });

            this.logger.logInfo({
                functionName: 'handleSessionDeleted',
                message: `Location deleted successfully for session: ${sessionId}`
            });
        } catch (error) {
            this.logger.logError({
                functionName: 'handleSessionDeleted',
                problem: `Failed to delete location for session: ${sessionId}: ${error.message}`,
                error
            });
        }
    }

    async handleSessionUpdated(data: UpdateLocationRequest)   {
        const location = await this.locationRepo.findOne({ownerId:data.ownerId,ownerType: OwnerType.SESSION});
        if(!location)
            throw new NotFoundException(`Location for session ${data.ownerId} not found`);
        let point : Geometry | undefined = undefined;
        if(data.latitude && data.longitude)
            point = {
                type: 'Point',
                coordinates: [data.longitude, data.latitude]
            };
        point = point ?? location.point;
        const result = await this.locationRepo.findOneAndUpdate({ownerId:data.ownerId,ownerType: OwnerType.SESSION},{
            address: data.address,
            governorate: data.governorate,
            point
        });
        return {
            address: result.address,
            governorate: result.governorate,
            latitude: data.latitude,
            longitude: data.longitude,
        }
    }

}