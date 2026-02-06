import { CreateUserProfileDto, PhotoMetadataDto } from "@app/common";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class NewUserDto 
{
    @ValidateNested()
    @Type(() => CreateUserProfileDto)
    createUserDto: CreateUserProfileDto;

    @ValidateNested()
    @Type(() => PhotoMetadataDto)
    photo: PhotoMetadataDto;
}