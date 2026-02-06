import { CreateUserProfileDto, PhotoMetadataDto } from "@app/common";

export class UserRegisteredEvent {
  createUserDto: CreateUserProfileDto;
  photo: PhotoMetadataDto;
}
