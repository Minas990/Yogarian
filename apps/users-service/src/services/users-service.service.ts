import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../models/user.model';
import { AppLoggerService, CloudinaryService, PhotoMetadataDto, UserProfileDto } from '@app/common';
import { UserRepository } from '../repos/user.repostiroy';
import { PhotoRepository } from '../repos/photo.repository';
import { Photo } from '../models/photo.model';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { UserLocation } from '../models/location.model';
import { LocationRepo } from '../repos/location.repo';
import { UpdateLocationDto } from '../dtos/update-location.dto';
import { SessionCreatedEvent } from '@app/common/events/session.created';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE } from '@app/kafka';
import { KAFKA_TOPICS } from '@app/kafka';
import { SendSessionCreationToNearbyUsersEvent } from '@app/common/events/send-session-creation-to-nearby-users.event';

@Injectable()
export class UsersService 
{
  constructor(
   private readonly UserRepo:UserRepository,
    private readonly PhotoRepo:PhotoRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
    private readonly locationRepo: LocationRepo,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka
  )
  {
    
  }

  async createUser(userDto:UserProfileDto , photoMetadata: PhotoMetadataDto) 
  {
    this.logger.logInfo({
      functionName: 'createUser',
      message: `KAFKA event received for userId: ${userDto.userId}, email: ${userDto.email}`,
      userId: userDto.userId,
      additionalData: { email: userDto.email }
    });

    const user = new User({
      ...userDto,
      location: undefined, // Location will be set separately if needed
    });
    
    const photoEntity = new Photo({
      url: photoMetadata.url,
      public_id: photoMetadata.public_id,
      filename: photoMetadata.filename,
      mimetype: photoMetadata.mimetype,
      createdAt: userDto.createdAt
    });
    user.photo = await this.PhotoRepo.create(photoEntity);
    
    this.logger.logInfo({
      functionName: 'createUser',
      message: `Creating user with email ${userDto.email}`,
      userId: user.userId,
      additionalData: { email: userDto.email }
    });
    const createdUser = await this.UserRepo.create(user);

    if (userDto.location)
    {
      const locationEntity = new UserLocation({
        userId: createdUser.userId,
        address: userDto.location.address,
        createdAt: userDto.createdAt,
        governorate: userDto.location.governorate,
        point: {
          type: "Point",
          coordinates: [userDto.location.longitude, userDto.location.latitude]
        }
      });
      await this.locationRepo.create(locationEntity);
    }

    return createdUser;
  }

  async getUserById(userId:string, exclude?: string[])
  {
    return this.UserRepo.findOne({userId},{photo:true}, exclude);
  }

  async getMe(userId:string)
  {
    return this.UserRepo.findOne({userId}, {photo:true, location:true});
  }

  //create in the abstract repo only call .save() so
  //technically it's not creating new user 
  // and can be used for updating user as well
  //it doesnt look so clean but it works :)

  async updateUser(userId:string, updateUserDto:UpdateUserDto, file?: Express.Multer.File)
  {
    if (file) 
    {
      const user = await this.UserRepo.findOne({ userId }, { photo: true });
      const oldPhotoPublicId = user.photo?.public_id;
      let newPhotoPublicId: string | undefined;
      
      try 
      {
        const cloudinaryResult = await this.cloudinaryService.uploadFile(
          file,
          this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER')
        );
        
        newPhotoPublicId = cloudinaryResult.public_id;

        const photoEntity = user.photo ?? new Photo();
        Object.assign(photoEntity, {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          filename: cloudinaryResult.original_filename,
          mimetype: file.mimetype,
        });

        user.photo = await this.PhotoRepo.create(photoEntity);
        Object.assign(user, updateUserDto);
        const result = await this.UserRepo.create(user);

        if (oldPhotoPublicId && oldPhotoPublicId !== newPhotoPublicId) 
        {
          await this.cloudinaryService.deleteFile(oldPhotoPublicId);
        }
        
        return result;
      } catch (error) {
        if (newPhotoPublicId) 
        {
          await this.cloudinaryService.deleteFile(newPhotoPublicId);
        }
        throw error;
      }
    }

    return this.UserRepo.findOneAndUpdate({ userId }, updateUserDto);
  }


  async updateUserEmail(userId: string, email: string)
  {
    return this.UserRepo.findOneAndUpdate({ userId }, { email });
  }

  // onDelete CASCADE is on Photo side now
  //deleting user will automatically delete the photo record // same for location
  async deleteUser(userId:string)
  {
    this.logger.logInfo({
      functionName: 'deleteUser',
      message: `Deleting user with userId: ${userId}`,
      userId: userId
    });
    const user = await this.UserRepo.findOne({userId}, {photo:true,location:true});
    const photoPublicId = user.photo?.public_id;
    await this.UserRepo.remove(user);
    if(photoPublicId)
      await this.cloudinaryService.deleteFile(photoPublicId);
  }

  async updateUserLocation(userId:string , updateLocationDto: UpdateLocationDto)
  {

    let point: any = null;
    if(updateLocationDto.latitude && updateLocationDto.longitude)
    {
      point = {
        type: "Point",
        coordinates: [updateLocationDto.longitude, updateLocationDto.latitude]
      }
      delete updateLocationDto.latitude;
      delete updateLocationDto.longitude;
    }
    else if(updateLocationDto.latitude || updateLocationDto.longitude)
      throw new BadRequestException('Both latitude and longitude must be provided');
    const location = await this.locationRepo.findOne({userId}).catch(() => null);
    if(location)
      return this.locationRepo.findOneAndUpdate({userId}, {...updateLocationDto, point});
    else return this.locationRepo.create(new UserLocation({...updateLocationDto, userId, point,createdAt: new Date()}));
  }

  async deleteUserLocation(userId:string)
  {
    await this.locationRepo.findOneAndDelete({userId});
  }

  async handleSessionCreated(event: SessionCreatedEvent)
  {
    const users = await this.locationRepo.findNearestUsers(event.latitude,event.longitude);
    if(!users)
    {
      this.logger.logInfo({
        functionName: 'handleSessionCreated',
        message: `No nearby users found for session created at latitude: ${event.latitude}, longitude: ${event.longitude}`,
        additionalData: { latitude: event.latitude, longitude: event.longitude }
      });
      return;
    }
    const sendEvent = new SendSessionCreationToNearbyUsersEvent()
    Object.assign(sendEvent, event)
    sendEvent.nearbyUsers = users;
    this.logger.logInfo({
      functionName: 'handleSessionCreated',
      message: `Emitting event to nearby users for session created at latitude: ${event.latitude}, longitude: ${event.longitude}`,
      additionalData: { latitude: event.latitude, longitude: event.longitude, nearbyUsersCount: users.length }
    });
    console.log('sample email', users[0]);
    this.kafkaClient.emit<SendSessionCreationToNearbyUsersEvent>(KAFKA_TOPICS.SEND_SESSIONS_CREATED_TO_NEAREST_USERS, sendEvent)
  }

}
