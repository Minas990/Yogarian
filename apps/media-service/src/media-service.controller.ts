import { BadRequestException, Controller, Delete, Get, Param, ParseArrayPipe, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { MediaServiceService } from './media-service.service';
import { AppLoggerService, CurrentUser, EmailConfirmedGuard, SessionDeletedEvent, SessionImagesCreationApprovedEvent, SessionImagesCreationRejectedEvent, SessionImagesDeletionApprovedEvent, SessionImagesDeletionRejectedEvent, UserDeletedEvent, type UserTokenPayload } from '@app/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { EventPattern, Payload } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { DeleteThrottleGuard, UploadThrottleGuard } from './guards/rate-limit.guard';
import { HttpOnlyJwtAuthGuard } from '@app/common/auth/guards/http-only-jwt-auth.guard';
import { PhotoStatus } from './types/photo-status.type';

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
    return this.mediaServiceService.uploadUserFile(user.userId,file);
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
  @Delete('user')
  async deleteFile(@CurrentUser() user : UserTokenPayload) 
  {
    return this.mediaServiceService.deleteUserFile(user.userId);
  }

  @EventPattern(KAFKA_TOPICS.USER_DELETED)
  async handleUserDeletedEvent(@Payload() event: UserDeletedEvent)
  {
    this.logger.logInfo({
      message:'Received user deleted event',
      functionName:'handleUserDeletedEvent',
      userId:event.userId
    });

    await this.mediaServiceService.deleteUserFile(event.userId).then(()=>{
      this.logger.logInfo({
        message:'User files deleted successfully after receiving user deleted event',
        functionName:'handleUserDeletedEvent',
        userId:event.userId
      });
    }).catch((err)=>{
      this.logger.logError({
        functionName:'handleUserDeletedEvent',
        userId:event.userId,
        error:err,
        problem:`Failed to delete user files after receiving user deleted event: ${err.message}`
      });
    });
  }
  
  @UseInterceptors(FilesInterceptor('files',3))
  @UseGuards(UploadThrottleGuard,EmailConfirmedGuard)
  @Post('sessions/:sessionId')
  async uploadSessionFiles(@Param('sessionId', ParseUUIDPipe) sessionId: string,@CurrentUser() user : UserTokenPayload,@UploadedFiles() files: Express.Multer.File[]) 
  {
    return this.mediaServiceService.uploadSessionFile(user.userId,sessionId,files);
  }

  @Get('sessions/:sessionId')
  async getSessionFiles(@Param('sessionId', ParseUUIDPipe) sessionId: string) 
  {
    return this.mediaServiceService.getSessionFiles(sessionId);
  }
  
  @Delete('sessions/:sessionId/photos')
  async deleteSessionFile(
    @CurrentUser() user : UserTokenPayload,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('photoIds',ParseArrayPipe) photoIds: number[])
  {
    if(!photoIds || photoIds.length === 0 || photoIds.length > 3)
      throw new BadRequestException('Invalid photoIds length');
    return this.mediaServiceService.deleteSessionFile(user.userId,sessionId,photoIds);
  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_CREATION_APPROVED)
  async handleSessionImageApprovedEvent(@Payload() event: SessionImagesCreationApprovedEvent)
  {
    this.logger.logInfo({
      message:'Received session image approved event',
      functionName:'handleSessionImageApprovedEvent',
      additionalData: {
        sessionId: event.sessionId,
        photoIds: event.photoIds
      }
    });
    return this.mediaServiceService.updateStatus(event.photoIds,PhotoStatus.APPROVED).then(()=>{
      this.logger.logInfo({
        message:'Session image status updated to approved successfully after receiving session image approved event',
        functionName:'handleSessionImageApprovedEvent',
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        }
      });
    }).catch((err)=>{
      this.logger.logError({
        functionName:'handleSessionImageApprovedEvent',
        error: err,
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        },
        problem:`Failed to update session image status to approved after receiving session image approved event: ${err.message}`
      });
    });  
  }
  
  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_CREATION_REJECTED)
  async handleSessionImageRejectedEvent(@Payload() event: SessionImagesCreationRejectedEvent)
  {
    this.logger.logInfo({
      message:'Received session image rejected event',
      functionName:'handleSessionImageRejectedEvent',
      additionalData: {
        sessionId: event.sessionId,
        photoIds: event.photoIds
      }
    });
    return this.mediaServiceService.deleteSessionImages(event.sessionId,event.photoIds,PhotoStatus.PENDING).then(()=>{
      this.logger.logInfo({
        message:'Session pending images deleted successfully after receiving session image rejected event',
        functionName:'handleSessionImageRejectedEvent',
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        }
      });
    }).catch((err)=>{
      this.logger.logError({
        functionName:'handleSessionImageRejectedEvent',
        error: err,
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        },
        problem:`Failed to delete pending session images after receiving session image rejected event: ${err.message}`
      });
    });  
  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_DELETION_APPROVED)
  async handleSessionImageDeletionApprovedEvent(@Payload() event: SessionImagesDeletionApprovedEvent)
  {
    this.logger.logInfo({
      message:'Received session image deletion approved event',
      functionName:'handleSessionImageDeletionApprovedEvent',
      additionalData: {
        sessionId: event.sessionId,
        photoIds: event.photoIds
      }
    });
    return this.mediaServiceService.deleteSessionImages(event.sessionId,event.photoIds).then(()=>{
      this.logger.logInfo({
        message:'Session images deleted successfully after receiving session image deletion approved event',
        functionName:'handleSessionImageDeletionApprovedEvent',
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        }
      });
    }).catch((err)=>{
      this.logger.logError({
        functionName:'handleSessionImageDeletionApprovedEvent',
        error: err,
        additionalData: {
          sessionId: event.sessionId,
          photoIds: event.photoIds
        },
        problem:`Failed to delete session images after receiving session image deletion approved event: ${err.message}`
      });
    });  
  }

  @EventPattern(KAFKA_TOPICS.SESSION_IMAGES_DELETION_REJECTED)
  async handleSessionImageDeletionRejectedEvent(@Payload() event: SessionImagesDeletionRejectedEvent)
  {
    //do nothing simply! the deletion request will be ignored and the photo will remain as is, we can log this event for monitoring purposes
    this.logger.logInfo({
      message:'Received session image deletion rejected event',
      functionName:'handleSessionImageDeletionRejectedEvent',
      additionalData: {
        sessionId: event.sessionId,
        photoIds: event.photoIds,
        userId: event.userId // the bad guy 
      }
    });
  }

  @EventPattern(KAFKA_TOPICS.SESSION_DELETED)
  async handleSessionDeletedEvent(@Payload() event: SessionDeletedEvent)
  {
    this.logger.logInfo({
      message: 'Received session deleted event',
      functionName: 'handleSessionDeletedEvent',
      additionalData: {
        sessionId: event.sessionId
      }
    });

    await this.mediaServiceService.deleteSessionImagesBySessionId(event.sessionId).then(() => {
      this.logger.logInfo({
        message: 'Session images deleted successfully after receiving session deleted event',
        functionName: 'handleSessionDeletedEvent',
        additionalData: {
          sessionId: event.sessionId
        }
      });
    }).catch((err) => {
      this.logger.logError({
        functionName: 'handleSessionDeletedEvent',
        error: err,
        additionalData: {
          sessionId: event.sessionId
        },
        problem: `Failed to delete session images after receiving session deleted event: ${err.message}`
      });
    });
  }
}