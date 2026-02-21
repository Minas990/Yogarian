import { AppLoggerService, LocationCreationFailedEvent, LocationCreationSuccessEvent, LocationUpdateFailedEvent, LocationUpdateSuccessEvent, SessionCreatedEvent, SessionUpdatedEvent } from "@app/common";
import { KAFKA_SERVICE, KAFKA_TOPICS } from "@app/kafka";
import { Inject, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { LocationRepo } from "./repos/location.repo";
import { CreateLocationDto } from "./dto/create-location.dto";
import { Geometry, UserLocation } from "./models/location.model";
import { OwnerType } from "@app/common/types/owners.types";
import { UpdateLocationDto } from "./dto/update-location.dto";

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

    async createLocation(userId: string, dto: CreateLocationDto): Promise<UserLocation> 
    {
        const location = new UserLocation({
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

    async handleSessionCreated(event: SessionCreatedEvent) {
        this.logger.logInfo({
            functionName: 'handleSessionCreated',
            message: `Creating location for session: ${event.sessionId}`
        });

        try {
            const location = new UserLocation({
                ownerId: event.sessionId,
                ownerType: OwnerType.SESSION,
                address: event.address,
                governorate: event.governorate,
                point: {
                    type: 'Point',
                    coordinates: [event.longitude, event.latitude]
                }
            });

            await this.locationRepo.create(location);

            this.kafkaService.emit(
                KAFKA_TOPICS.LOCATION_CREATED_SUCCESS,
                new LocationCreationSuccessEvent({ sessionId: event.sessionId })
            );

            this.logger.logInfo({
                functionName: 'handleSessionCreated',
                message: `Location created successfully for session: ${event.sessionId}`
            });
        } catch (error) {
            this.logger.logError({
                functionName: 'handleSessionCreated',
                problem: `Failed to create location for session: ${event.sessionId}: ${error.message}`,
                error
            });

            this.kafkaService.emit(
                KAFKA_TOPICS.LOCATION_CREATION_FAILED,
                new LocationCreationFailedEvent({
                    sessionId: event.sessionId,
                    reason: error.message
                })
            );
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

    async handleSessionUpdated(event: SessionUpdatedEvent) {
        this.logger.logInfo({
            functionName: 'handleSessionUpdated',
            message: `Updating location for session: ${event.sessionId}`
        });

        try {
            const point: Geometry = {
                type: 'Point',
                coordinates: [event.longitude, event.latitude]
            };

            await this.locationRepo.findOneAndUpdate(
                {
                    ownerId: event.sessionId,
                    ownerType: OwnerType.SESSION
                },
                {
                    address: event.address,
                    governorate: event.governorate,
                    point
                }
            );

            this.kafkaService.emit(
                KAFKA_TOPICS.LOCATION_UPDATE_SUCCESS,
                new LocationUpdateSuccessEvent({ sessionId: event.sessionId })
            );

            this.logger.logInfo({
                functionName: 'handleSessionUpdated',
                message: `Location updated successfully for session: ${event.sessionId}`
            });
        } catch (error) {
            this.logger.logError({
                functionName: 'handleSessionUpdated',
                problem: `Failed to update location for session: ${event.sessionId}: ${error.message}`,
                error
            });

            this.kafkaService.emit(
                KAFKA_TOPICS.LOCATION_UPDATE_FAILED,
                new LocationUpdateFailedEvent({
                    sessionId: event.sessionId,
                    reason: error.message
                })
            );
        }
    }

    async test(body: any)
    {
        const location = new UserLocation({
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