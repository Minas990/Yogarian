import { AppLoggerService, LocationCreationFailedEvent, LocationCreationSuccessEvent, LocationUpdateFailedEvent, LocationUpdateSuccessEvent, SessionCreatedEvent, SessionUpdatedEvent } from "@app/common";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { LocationRepo } from "./repos/location.repo";
import { CreateLocationDto } from "./dto/create-location.dto";
import { Geometry, Location } from "./models/location.model";
import { OwnerType } from "@app/common/types/owners.types";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { CreateLocationRequest, UpdateLocationRequest, UpdateLocationResponse } from "@app/common/generated/location";

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

    async getNearestSessions(latitude: number, longitude: number, radius?: number, limit?: number,page?: number )
    {
        return this.locationRepo.findNearestSessionsId(latitude, longitude, radius ?? 1000, page ?? 1, limit ?? 10);
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
        return this.locationRepo.create(location);
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
        return this.locationRepo.findOneAndUpdate({ownerId:data.ownerId,ownerType: OwnerType.SESSION},{
            address: data.address,
            governorate: data.governorate,
            point
        });
    }

    async getNearbyUsers(event: SessionCreatedEvent)
    {
        const nearbyUsers = await this.locationRepo.findNearestUsers(event.latitude, event.longitude, 10000,100);//nearest 100 user that are
        this.logger.logInfo({
            functionName: 'getNearbyUsers',
            message: `Found ${nearbyUsers.length} nearby users for session ${event.sessionId}`
        });
        this.kafkaService.emit(KAFKA_TOPICS.NEAREST_USERS_FOUND, {
            sessionId: event.sessionId,
            users: nearbyUsers
        })
    }

    async test(body: any)
    {
        const location = new Location({
            ownerId: body.ownerId,
            ownerType: body.ownerType,
            address: body.address,
            governorate: body.governorate,
            point: {
                type: 'Point',
                coordinates: [body.longitude, body.latitude]
            }
        });
        return this.locationRepo.create(location);
    }

}