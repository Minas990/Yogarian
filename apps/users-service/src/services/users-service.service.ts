import {  Injectable } from '@nestjs/common';
import { User } from '../models/user.model';
import { CloudinaryService, CreateUserProfileDto, PhotoMetadataDto, UpdateUserDto } from '@app/common';
import { UserRepository } from '../repos/user.repostiroy';
import { PhotoRepository } from '../repos/photo.repository';
import { Photo } from '../models/photo.model';

@Injectable()
export class UsersService 
{
  constructor(
   private readonly UserRepo:UserRepository,
    private readonly PhotoRepo:PhotoRepository,
    private readonly cloudinaryService: CloudinaryService
  )
  {
    
  }

  async createUser(userDto: CreateUserProfileDto, photoMetadata: PhotoMetadataDto) 
  {
    const user = new User({
      ...userDto,
    });
    
    const photoEntity = new Photo({
      url: photoMetadata.url,
      public_id: photoMetadata.public_id,
      filename: photoMetadata.filename,
      mimetype: photoMetadata.mimetype,
    });
    user.photo = await this.PhotoRepo.create(photoEntity);
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

  async updateUser(userId:string,updateUserDto:UpdateUserDto&{photo?: PhotoMetadataDto})
  {
    const { photo, ...rest } = updateUserDto;

    if (photo) 
    {
      const user = await this.UserRepo.findOne({ userId }, { photo: true });
      const photoEntity = new Photo({
        url: photo.url,
        public_id: photo.public_id,
        filename: photo.filename,
        mimetype: photo.mimetype,
      });
      user.photo = await this.PhotoRepo.create(photoEntity);
      Object.assign(user, rest);
      return this.UserRepo.create(user);
    }

    return this.UserRepo.findOneAndUpdate({ userId }, rest);
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
