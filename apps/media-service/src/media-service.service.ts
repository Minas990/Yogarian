import { AppLoggerService, CloudinaryService, ImagesSessionCreatedEvent, ImagesSessionDeletedEvent } from '@app/common';
import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotoRepository } from './repos/photo.repository';
import { Photo } from './models/photo.model';
import { OwnerType } from '../../../libs/common/src/types/owners.types';
import { PhotoStatus } from './types/photo-status.type';
import { In } from 'typeorm';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';

@Injectable()
export class MediaServiceService implements OnModuleInit {
    constructor(
        private configService: ConfigService,
        private cloudinaryService: CloudinaryService,
        private photoRepo: PhotoRepository,
        private logger: AppLoggerService,
        @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka
    )
    {

    }

    async onModuleInit() {
        await this.kafkaClient.connect();
    }

    private async createPhotoRecord(ownerType: OwnerType, ownerId: string, file: Express.Multer.File, folder: string, status: PhotoStatus)
    {
        const result = await this.cloudinaryService.uploadFile(file, folder);
        const photo = new Photo({
            createdAt: new Date(),
            filename: result.original_filename,
            mimetype: result.type,
            OwnerId: ownerId,
            ownerType: ownerType,
            public_id: result.public_id,
            url: result.secure_url,
            status,
        });

        return this.photoRepo.create(photo);
    }

    private async replacePhoto(existingPhoto: Photo, file: Express.Multer.File, folder: string, functionName: string, userId?: string)
    {
        const oldPublicId = existingPhoto.public_id;
        let newPublicId: string | null = null;

        try
        {
            const uploadResult = await this.cloudinaryService.uploadFile(file, folder);
            newPublicId = uploadResult.public_id;

            existingPhoto.url = uploadResult.secure_url;
            existingPhoto.public_id = uploadResult.public_id;
            existingPhoto.filename = uploadResult.original_filename;
            existingPhoto.mimetype = uploadResult.type;
            existingPhoto.createdAt = new Date();

            const updatedPhoto = await this.photoRepo.create(existingPhoto);
            await this.cloudinaryService.deleteFile(oldPublicId);

            return updatedPhoto;
        }
        catch (error)
        {
            if (newPublicId)
            {
                try
                {
                    await this.cloudinaryService.deleteFile(newPublicId);
                }
                catch (cleanupError)
                {
                    this.logger.logError({
                        functionName,
                        userId,
                        error: cleanupError.message,
                        problem: 'Failed to cleanup newly uploaded file after DB update failure'
                    });
                }
            }

            throw new Error(`Failed to update file: ${error.message}`);
        }
    }

    private async removePhotos(photos: Photo[])
    {
        for (const photo of photos)
        {
            await this.cloudinaryService.deleteFile(photo.public_id);
            await this.photoRepo.remove(photo);
        }
    }

    async getUserFile(userId:string)
    {
        return this.photoRepo.findOne({ownerType:OwnerType.USER,OwnerId:userId});
    }

    async uploadUserFile(userId: string, file: Express.Multer.File) 
    {
        const existingPhoto = await this.photoRepo.findOne({ ownerType: OwnerType.USER, OwnerId: userId });
        if (existingPhoto)
            return { message: 'File already exists for the user, use update endpoint to update the file' };

        return this.createPhotoRecord(
            OwnerType.USER,
            userId,
            file,
            this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER'),
            PhotoStatus.APPROVED
        );
    }

    async deleteUserFile(userId:string)
    {
        const photo = await this.photoRepo.findOne({ownerType:OwnerType.USER,OwnerId:userId});
        if(!photo)
            return {message:'No file found for the user'};
        if(photo)
        {
            await this.cloudinaryService.deleteFile(photo.public_id);
            await this.photoRepo.remove(photo);
        }
        return {message:'File deleted successfully'};
    }

    async deleteSessionImagesBySessionId(sessionId: string)
    {
        const photos = await this.photoRepo.find({ownerType:OwnerType.SESSION, OwnerId:sessionId});
        await this.removePhotos(photos);
        this.logger.logInfo({
            message: `Deleted ${photos.length} images for session`,
            functionName: 'deleteSessionImagesBySessionId',
            additionalData: { sessionId, deletedCount: photos.length }
        });
    }

    async updateUserFile(userId: string, file: Express.Multer.File)
    {
        const existingPhoto = await this.photoRepo.findOne(
            { ownerType: OwnerType.USER, OwnerId: userId }
        );
        if (!existingPhoto) 
            throw new Error('No existing file found for the user');

        const updatedPhoto = await this.replacePhoto(
            existingPhoto,
            file,
            this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER'),
            'updateUserFile',
            userId
        );

        this.logger.logInfo({
            message: 'File updated successfully',
            functionName: 'updateUserFile',
            userId
        });

        return {
            message: 'File updated successfully',
            photo: updatedPhoto
        };
    }

    async updateStatus(photoIds:number[],status:PhotoStatus)
    {
        const photos = await this.photoRepo.find({id:In(photoIds)});
        if(photos.length === 0)//should not happend
            throw new Error('Photos not found');
        for(const photo of photos)
        {
            photo.status = status;
            await this.photoRepo.create(photo);
        }
    }

    async uploadSessionFile(userId: string, sessionId: string, files: Express.Multer.File[]) 
    {
        const existingPhotos = await this.photoRepo.find({ ownerType: OwnerType.SESSION, OwnerId: sessionId });
        if (existingPhotos.length + files.length > 3)
            throw new BadRequestException('A session can have a maximum of 3 photos');

        const uploadResults: any[] = [];
        const folder = this.configService.getOrThrow<string>('CLOUDINARY_SESSION_PHOTO_FOLDER');
        for(const file of files)
        {
            try {
                const photo = await this.createPhotoRecord(OwnerType.SESSION, sessionId, file, folder, PhotoStatus.PENDING);
                uploadResults.push( {
                    id: photo.id,
                    status: photo.status,
                    url:photo.url
                });
            } 
            catch (error) 
            {
                this.logger.logError({
                    functionName: 'uploadSessionFile',
                    problem: 'Failed to upload session file',
                    error: error.message
                });
            }
        }

        this.kafkaClient.emit(
            KAFKA_TOPICS.IMAGES_SESSION_CREATED,
            new ImagesSessionCreatedEvent({
                userId,
                sessionId,
                photoIds: uploadResults.map((result) => result.id)
            })
        );

        return uploadResults;
    }

    async getSessionFiles(sessionId: string)
    {
        return this.photoRepo.find({ownerType:OwnerType.SESSION,OwnerId:sessionId,status:PhotoStatus.APPROVED});
    }

    async deleteSessionFile(userId: string,sessionId: string,photoId: number)
    {
        const photo = await this.photoRepo.findOne({id:photoId});
        if(!photo || photo.ownerType !== OwnerType.SESSION || photo.OwnerId !== sessionId || photo.status !== PhotoStatus.APPROVED)
            throw new BadRequestException('Photo not found or cannot be deleted');
        this.kafkaClient.emit(
            KAFKA_TOPICS.IMAGES_SESSION_DELETED,
            new ImagesSessionDeletedEvent({
                userId,
                sessionId,
                photoId
            })
        );
        return {message:'Photo deletion request sent successfully'};
    }

    async deleteSessionImages(sessionId: string, photoIds: number[], status: PhotoStatus =  PhotoStatus.APPROVED)
    {
        const photos = await this.photoRepo.find({ownerType:OwnerType.SESSION,OwnerId:sessionId,status,id: In(photoIds)});
        await this.removePhotos(photos);
    }
}
