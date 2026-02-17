import { AppLoggerService, CloudinaryService } from '@app/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PhotoRepository } from './repos/photo.repository';
import { Photo } from './models/photo.model';
import { OwnerType } from '../../../libs/common/src/types/owners.types';

@Injectable()
export class MediaServiceService {
    constructor(
        private configService: ConfigService,
        private cloudinaryService: CloudinaryService,
        private photoRepo: PhotoRepository,
        private logger: AppLoggerService
    )
    {

    }

    async getUserFile(userId:string)
    {
        return this.photoRepo.findOne({ownerType:OwnerType.USER,OwnerId:userId});
    }

    async uploadUserFile(userId: string, file: Express.Multer.File) 
    {

        const result  = await this.cloudinaryService.uploadFile(file,this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER') );
        const photo = new Photo({
            createdAt: new Date(),
            filename:result.original_filename,
            mimetype:result.type,
            OwnerId:userId,
            ownerType:OwnerType.USER,
            public_id:result.public_id,
            url:result.secure_url
        });
        return this.photoRepo.create(photo);
    }

    async deleteUserFile(userId:string)
    {
        const photo = await this.photoRepo.findOne({ownerType:OwnerType.USER,OwnerId:userId});
        if(!photo)
            return {message:'No file found for the user'};
        await this.cloudinaryService.deleteFile(photo.public_id);
        await this.photoRepo.remove(photo);
        return {message:'File deleted successfully'};
    }


    async updateUserFile(userId: string, file: Express.Multer.File)
    {
        const existingPhoto = await this.photoRepo.findOne(
            { ownerType: OwnerType.USER, OwnerId: userId }
        );
        if (!existingPhoto) 
            throw new Error('No existing file found for the user');
        
        const oldPublicId = existingPhoto.public_id; 
        let newPublicId: string | null = null;

        try 
        {
            const uploadResult = await this.cloudinaryService.uploadFile(
                file,
                this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER')
            );
            
            newPublicId = uploadResult.public_id;
            
            existingPhoto.url = uploadResult.secure_url;
            existingPhoto.public_id = uploadResult.public_id;
            existingPhoto.filename = uploadResult.original_filename;
            existingPhoto.mimetype = uploadResult.type;
            existingPhoto.createdAt = new Date();
            
            const updatedPhoto = await this.photoRepo.create(existingPhoto);

            await this.cloudinaryService.deleteFile(oldPublicId);       

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
                        functionName: 'updateUserFile',
                        userId,
                        error: cleanupError.message,
                        problem: 'Failed to cleanup newly uploaded file after DB update failure'
                    });
                    console.error('Failed to cleanup uploaded file:', cleanupError);
                }
            }
            throw new Error(`Failed to update file: ${error.message}`);
        }
    }



}
