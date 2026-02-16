import {  Injectable } from '@nestjs/common';
import { User } from '../models/user.model';
import { AppLoggerService,UserProfileDto } from '@app/common';
import { UserRepository } from '../repos/user.repostiroy';
import { UpdateUserDto } from '../dtos/update-user.dto';


@Injectable()
export class UsersService 
{
  constructor(
   private readonly UserRepo:UserRepository,
    private readonly logger: AppLoggerService,
  )
  {
    
  }

  async createUser(userDto:UserProfileDto ) 
  {
    this.logger.logInfo({
      functionName: 'createUser',
      message: `KAFKA event received for userId: ${userDto.userId}, email: ${userDto.email}`,
      userId: userDto.userId,
      additionalData: { email: userDto.email }
    });

    const user = new User({
      ...userDto,
    });
    
    this.logger.logInfo({
      functionName: 'createUser',
      message: `Creating user with email ${userDto.email}`,
      userId: user.userId,
      additionalData: { email: userDto.email }
    });
    const createdUser = await this.UserRepo.create(user);

    return createdUser;
  }

  async getUserById(userId:string, exclude?: string[])
  {
    return this.UserRepo.findOne({userId}, {}, exclude);
  }

  async getMe(userId:string)
  {
    return this.UserRepo.findOne({userId});
  }

  //create in the abstract repo only call .save() so
  //technically it's not creating new user 
  // and can be used for updating user as well
  //it doesnt look so clean but it works :)

  async updateUser(userId:string, updateUserDto:UpdateUserDto, file?: Express.Multer.File)
  {   
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

    const user = await this.UserRepo.findOne({userId});
    await this.UserRepo.remove(user);
  }

  // async updateUserLocation(userId:string , updateLocationDto: UpdateLocationDto)
  // {

  //   let point: any = null;
  //   if(updateLocationDto.latitude && updateLocationDto.longitude)
  //   {
  //     point = {
  //       type: "Point",
  //       coordinates: [updateLocationDto.longitude, updateLocationDto.latitude]
  //     }
  //     delete updateLocationDto.latitude;
  //     delete updateLocationDto.longitude;
  //   }
  //   else if(updateLocationDto.latitude || updateLocationDto.longitude)
  //     throw new BadRequestException('Both latitude and longitude must be provided');
  //   const location = await this.locationRepo.findOne({userId}).catch(() => null);
  //   if(location)
  //     return this.locationRepo.findOneAndUpdate({userId}, {...updateLocationDto, point});
  //   else return this.locationRepo.create(new UserLocation({...updateLocationDto, userId, point,createdAt: new Date()}));
  // }

  // async deleteUserLocation(userId:string)
  // {
  //   await this.locationRepo.findOneAndDelete({userId});
  // }

  // async handleSessionCreated(event: SessionCreatedEvent)
  // {
  //   const users = await this.locationRepo.findNearestUsers(event.latitude,event.longitude);
  //   if(!users)
  //   {
  //     this.logger.logInfo({
  //       functionName: 'handleSessionCreated',
  //       message: `No nearby users found for session created at latitude: ${event.latitude}, longitude: ${event.longitude}`,
  //       additionalData: { latitude: event.latitude, longitude: event.longitude }
  //     });
  //     return;
  //   }
  //   const sendEvent = new SendSessionCreationToNearbyUsersEvent()
  //   Object.assign(sendEvent, event)
  //   sendEvent.nearbyUsers = users;
  //   this.logger.logInfo({
  //     functionName: 'handleSessionCreated',
  //     message: `Emitting event to nearby users for session created at latitude: ${event.latitude}, longitude: ${event.longitude}`,
  //     additionalData: { latitude: event.latitude, longitude: event.longitude, nearbyUsersCount: users.length }
  //   });
  //   console.log('sample email', users[0]);
  //   this.kafkaClient.emit<SendSessionCreationToNearbyUsersEvent>(KAFKA_TOPICS.SEND_SESSIONS_CREATED_TO_NEAREST_USERS, sendEvent)
  // }

}
