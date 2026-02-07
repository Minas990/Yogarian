import { PhotoMetadataDto, UserProfileDto } from '../dtos';

export class UserRegisteredEvent {
  profile: UserProfileDto;
  photo: PhotoMetadataDto;
}
