import { IsDateString, IsNumber, IsString } from 'class-validator';

//temporary adding the decorators bcs we test 
export class SessionCreatedEvent {
    @IsNumber()
    longitude: number;

    @IsNumber()
    latitude: number;

    @IsString()
    creator: string;

    @IsDateString()
    startingTime: Date;

    @IsDateString()
    endTime: Date;

    @IsString()
    address: string;

    @IsString()
    governorate: string;
}