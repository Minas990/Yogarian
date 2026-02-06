import { BadRequestException, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { CloudinaryService, CreateUserDto, PhotoMetadataDto, Roles } from '@app/common';
import { AuthUserRepository } from './repo/user.repository';
import { AuthUser } from './models/auth-user.model';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { UserRegisteredEvent } from './events/UserRegistered.event';

@Injectable()
export class AuthServiceService implements OnModuleInit
{
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly jwtService: JwtService,
    @Inject(KAFKA_SERVICE) private readonly kafka: ClientKafka,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService
  ) 
  {

  }

  async onModuleInit() {
    await this.kafka.connect();
  }

  async signUp(createUserDto: CreateUserDto,file: Express.Multer.File)
  {
    if(!file)
        throw new BadRequestException('Profile photo is required');

    const user = new AuthUser({
      ...createUserDto,
      password : await bcrypt.hash(createUserDto.password,12)
    });

    const result = await this.authUserRepository.create(user);

    const cloudinaryResult = await this.cloudinaryService.uploadFile(file,this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER'));

    this.kafka.emit<UserRegisteredEvent>(KAFKA_TOPICS.USER_REGISTERED,{
      createUserDto : {
          userId: result.userId,
          email: result.email,
          name: createUserDto.name,
      },  
      photo: {
          url: cloudinaryResult.secure_url, 
          public_id: cloudinaryResult.public_id,
          filename: cloudinaryResult.original_filename,
          mimetype: cloudinaryResult.mimetype,
      }
    });
    return {
      message:'User registered successfully',
      user : {
        email: result.email,
        photoUrl: cloudinaryResult.secure_url,
      }
    };
  }

  async logIn(email:string , password:string ) : Promise<{token:string, user: AuthUser}>
  {
    try {
      const user = await this.authUserRepository.findOne({email});
      const hashedPassword = user.password;
      if(!await bcrypt.compare(password,hashedPassword))
          throw new BadRequestException('Invalid credentials');
      const token = this.signToken(user.userId,user.email,user.role);
      return {token, user};
      
    } catch (error) { //findOne 
      throw new BadRequestException('Invalid credentials');
    }
  }

  async updateEmail()
  {
    this.kafka.emit(KAFKA_TOPICS.USER_EMAIL_UPDATED,{});
  }

  async updatePassword()
  {

  }

  async deleteAccount(userId:string)
  {
    await this.authUserRepository.findOneAndDelete({userId});
    this.kafka.emit(KAFKA_TOPICS.USER_DELETED,{userId});
  }

  private signToken(userId:string,email:string,userRole:Roles)
  {
    return this.jwtService.sign({userId,email,role:userRole});
  }

}

