import { LocationDto } from "../dtos/location.dto";

export class SessionCreatedLocationEvent 
{
    latitude: number;
    longitude: number;
    governorate: string;
    address: string;

    constructor(location: LocationDto) {
        this.latitude = location.latitude;
        this.longitude = location.longitude;
        this.governorate = location.governorate;
        this.address = location.address;
    }
}