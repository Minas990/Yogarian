import { AppLoggerService } from "@app/common";
import { KAFKA_SERVICE } from "@app/kafka";
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
        if(dto.latitude && dto.longitude)
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
        return this.locationRepo.findNearestSessionsId(latitude, longitude, radius ?? 5000, page ?? 1, limit ?? 10);
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
                problem: `Error handling user deleted event for userId: ${userId}`,
                error: error.message
            });
        }
    }

}