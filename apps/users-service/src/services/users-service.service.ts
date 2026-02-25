import {  Inject, Injectable } from '@nestjs/common';
import { User } from '../models/user.model';
import { AppLoggerService,SessionCreatedEvent,UserProfileDto } from '@app/common';
import { UserRepository } from '../repos/user.repostiroy';
import { UpdateUserDto } from '../dtos/update-user.dto';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { In } from 'typeorm';
import { UserProfileUpdatedEvent } from '@app/common/events/user-profile-updated.event';


@Injectable()
export class UsersService 
{
  constructor(
   private readonly UserRepo:UserRepository,
    private readonly logger: AppLoggerService,
    @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka
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
    const result =  this.UserRepo.findOneAndUpdate({ userId }, updateUserDto);
    const event = new UserProfileUpdatedEvent({userId,name:updateUserDto.name,phoneNumber:updateUserDto.phoneNumber});
    this.kafkaClient.emit(KAFKA_TOPICS.USER_PROFILE_UPDATED, event);
    return result;
  }


  async updateUserEmail(userId: string, email: string)
  {
    return this.UserRepo.findOneAndUpdate({ userId }, { email });
  }

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

  async notifyFollowersAboutNewSession(event: SessionCreatedEvent, followers: string[],message:string)
  {
    this.logger.logInfo({
      functionName: 'notifyFollowersAboutNewSession',
      message: `Notifying followers about new session for session ${event.sessionId} created by user ${event.userId} with ${followers.length} followers.`,
    });
    const emails = await this.UserRepo.find({userId: In(followers) }).then(users => users.map(user => user.email));
    const trainerName = await this.UserRepo.findOne({userId: event.userId});
    this.kafkaClient.emit(KAFKA_TOPICS.NEW_SESSION_NOTIFICATION,{
      emails,
      sessionId: event.sessionId,
      trainerName: trainerName.name,
      trainerId: event.userId,
      message
    })

  }

}
