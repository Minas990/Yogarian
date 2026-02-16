import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaServiceService } from './media-service.service';
import { AppLoggerService, CurrentUser, EmailConfirmedGuard, JwtAuthGuard,UserDeletedEvent,type UserTokenPayload } from '@app/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { EventPattern } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { DeleteThrottleGuard, UploadThrottleGuard } from './guards/rate-limit.guard';
import { HttpOnlyJwtAuthGuard } from './guards/http-only-jwt-auth.guard';

@UseGuards(HttpOnlyJwtAuthGuard)
@Controller('media')
export class MediaServiceController {
  constructor(private readonly mediaServiceService: MediaServiceService,private logger: AppLoggerService) 
  {

  }

  @Get('user')
  async getMyFile(@CurrentUser() user : UserTokenPayload)
  {
    return this.mediaServiceService.getUserFile(user.userId);
  }

  @Get('user/:userId')
  async getUserFile(@Param('userId') userId: string)
  {
    const photo = await this.mediaServiceService.getUserFile(userId);
    return {
      url :photo.url,
      message: 'User file retrieved successfully'
    }
  }

  @UseGuards(UploadThrottleGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Post('user')
  async uploadFile(@CurrentUser() user : UserTokenPayload, @UploadedFile() file: Express.Multer.File) 
  {
    if(!file)
      throw new BadRequestException('File is required');
    try
    {
      await this.mediaServiceService.getUserFile(user.userId);
      return {
        message:'File already exists for the user, use update endpoint to update the file'
      }
    }
    catch(err)
    {
      return this.mediaServiceService.uploadUserFile(user.userId,file);
    }

  }

  @UseGuards(UploadThrottleGuard)
  @Patch('user')
  @UseInterceptors(FileInterceptor('file'))
  async updateFile(@CurrentUser() user : UserTokenPayload, @UploadedFile() file: Express.Multer.File) 
  {
    if(!file)
      throw new BadRequestException('File is required');
    return this.mediaServiceService.updateUserFile(user.userId,file);
  }

  @UseGuards(DeleteThrottleGuard)
  @Delete('user')//for all sessions and user files
  async deleteFile(@CurrentUser() user : UserTokenPayload) 
  {
    return this.mediaServiceService.deleteUserFile(user.userId);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeletedEvent(event: UserDeletedEvent)
  {
    this.logger.logInfo({
      message:'Received user deleted event',
      functionName:'handleUserDeletedEvent',
      userId:event.userId
    });

    await this.mediaServiceService.deleteUserFile(event.userId).catch((err)=>{
      this.logger.logError({
        functionName:'handleUserDeletedEvent',
        userId:event.userId,
        error:err.message,
        problem:'Failed to delete user files after receiving user deleted event'
      });
    }).then(()=>{
      this.logger.logInfo({
        message:'User files deleted successfully after receiving user deleted event',
        functionName:'handleUserDeletedEvent',
        userId:event.userId
      });
    });
  }
  
  @UseInterceptors(FilesInterceptor('files'))
  @Post('sessions')
  async uploadSessionFiles(@CurrentUser() user : UserTokenPayload,files: Express.Multer.File[]) : Promise<string>
  {
    return 'Session files uploaded successfully';
  }

  @EventPattern(KAFKA_TOPICS.SESSION_DELETED)
  async handleSessionDeletedEvent(events: any)
  {
    return 'Session files deleted successfully';
  }

}
