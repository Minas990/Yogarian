import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../models/user.model';
import { AppLoggerService, CloudinaryService, PhotoMetadataDto, UserProfileDto } from '@app/common';
import { UserRepository } from '../repos/user.repostiroy';
import { PhotoRepository } from '../repos/photo.repository';
import { Photo } from '../models/photo.model';
import { UpdateUserDto } from '../dtos/update-user.dto';

@Injectable()
export class UsersService 
{
  constructor(
   private readonly UserRepo:UserRepository,
    private readonly PhotoRepo:PhotoRepository,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService
  )
  {
    
  }

  async createUser(userDto:UserProfileDto, photoMetadata: PhotoMetadataDto) 
  {
    const user = new User({
      ...userDto,
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
    return this.UserRepo.create(user);
  }

  async getUserById(userId:string)
  {
    return this.UserRepo.findOne({userId},{photo:true});
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
        
        const photoEntity = new Photo({
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          filename: cloudinaryResult.original_filename,
          mimetype: cloudinaryResult.mimetype,
        });
        
        user.photo = await this.PhotoRepo.create(photoEntity);
        Object.assign(user, updateUserDto);
        const result = await this.UserRepo.create(user);
        
        if (oldPhotoPublicId) 
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
  //deleting user will automatically delete the photo record
  async deleteUser(userId:string)
  {
    const user = await this.UserRepo.findOne({userId}, {photo:true});
    const photoPublicId = user.photo?.public_id;
    await this.UserRepo.remove(user);
    if(photoPublicId)
      await this.cloudinaryService.deleteFile(photoPublicId);
  }

}
