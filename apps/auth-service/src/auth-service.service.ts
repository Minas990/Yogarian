import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ClientKafka } from '@nestjs/microservices';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { CloudinaryService, Roles, UserRegisteredEvent, OtpSentEvent, PasswordResetTokenSentEvent, UserDeletedEvent, UserEmailUpdatedEvent, AppLoggerService } from '@app/common';
import { CreateUserDto } from './dtos/create-user.dto';
import { AuthUserRepository } from './repo/user.repository';
import { AuthUser } from './models/auth-user.model';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthServiceService implements OnModuleInit
{
  private logger = new Logger(AuthServiceService.name);
  constructor(
    private readonly authUserRepository: AuthUserRepository,
    private readonly jwtService: JwtService,
    @Inject(KAFKA_SERVICE) private readonly kafka: ClientKafka,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLoggerService
  ) 
  {

  }

  async onModuleInit() {
    await this.kafka.connect();
  }

  async signUp(createUserDto: CreateUserDto,file: Express.Multer.File)
  {

    const cloudinaryResult = await this.cloudinaryService.uploadFile(file,this.configService.getOrThrow<string>('CLOUDINARY_USER_PHOTO_FOLDER'));
    const user = new AuthUser({
      ...createUserDto,
      password : await bcrypt.hash(createUserDto.password,12),
      createdAt: new Date(),
    });
    try {
      const result = await this.authUserRepository.create(user);
      const event: UserRegisteredEvent = {
        profile: {
          userId: result.userId,
          email: result.email,
          name: createUserDto.name,
          createdAt: result.createdAt,
        },
        photo: {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
          filename: cloudinaryResult.original_filename, 
          mimetype: file.mimetype,
        },
      };
      this.kafka.emit<UserRegisteredEvent>(KAFKA_TOPICS.USER_REGISTERED,event);
      this.appLogger.logInfo({
        functionName: 'signUp',
        message: `User registered with email: ${result.email}`,
        userId: result.userId,
        additionalData: { email: result.email }
      });
      this.appLogger.logInfo({
        functionName: 'signUp',
        message: `Emitted Kafka event: ${KAFKA_TOPICS.USER_REGISTERED} for userId: ${result.userId}`,
        userId: result.userId,
        additionalData: { event }
      });
      return {
        message:'User registered successfully',
        user : {
          email: result.email,
          photoUrl: cloudinaryResult.secure_url,
        }
      };
    } catch (error) {
      await this.cloudinaryService.deleteFile(cloudinaryResult.public_id);
      this.appLogger.logError({
        functionName: 'signUp',
        problem: 'Failed to register user', 
        error: error,
        additionalData: { email: createUserDto.email }
      });
      throw error;
    }
  }

  async logIn(email:string , password:string ) : Promise<{token:string, user: AuthUser}>
  {
    try {
      const user = await this.authUserRepository.findOne({email});
      const hashedPassword = user.password;
      if(!await bcrypt.compare(password,hashedPassword))
          throw new BadRequestException('Invalid credentials');
      const token = this.signToken(user.userId,user.email,user.role,user.isEmailConfirmed);
      return {token, user};
      
    } catch (error) { //findOne 
      throw new BadRequestException('Invalid credentials');
    }
  }

  async sendOtp(userId:string,email:string)
  {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = new Date(Date.now() + (Number(this.configService.get('OTP_EXPIRATION_TIME')) ?? 300000)); //default to 5 minutes
    await this.authUserRepository.findOneAndUpdate({userId,isEmailConfirmed:false}, {otp:hashedOtp,otpExpiresAt});
    this.kafka.emit<OtpSentEvent>(KAFKA_TOPICS.OTP_SENT,{userId,otp,email} as OtpSentEvent);
    this.appLogger.logInfo({
      functionName: 'sendOtp',
      message: `OTP sent to email: ${email} for userId: ${userId}`,
      userId: userId,
      additionalData: { email }
    });
  }

  async confirmEmail(userId:string,otp:string)
  {
    const user = await this.authUserRepository.findOne({userId});
    if(!user.otp)
      throw new ForbiddenException('No otp found plz request for new one');
    if(user.otpExpiresAt < new Date())
      throw new ForbiddenException('OTP expired plz request for new one');
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');
    if(!crypto.timingSafeEqual(Buffer.from(user.otp), Buffer.from(hashedOtp)))
      throw new ForbiddenException('Invalid OTP');
    return this.authUserRepository.findOneAndUpdate({userId},{isEmailConfirmed:true,otp:'',otpExpiresAt:new Date(0) as any});
  }

  async sendPasswordResetToken(email:string)
  {
    const user = await this.authUserRepository.findOne({email}).catch(() => null);
    if(!user)
    {
      await new Promise(resolve => setTimeout(resolve, 100));//good trick :) 
      return;
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiresAt = new Date(Date.now() + (Number(this.configService.get('PASSWORD_RESET_TOKEN_EXPIRATION_TIME')) ?? 3600000));
    await this.authUserRepository.findOneAndUpdate({userId:user.userId}, {passwordResetToken:hashedResetToken,passwordResetTokenExpiresAt:resetTokenExpiresAt});
    this.kafka.emit<PasswordResetTokenSentEvent>(KAFKA_TOPICS.PASSWORD_RESET_TOKEN_SENT,{userId:user.userId,resetToken,email} as PasswordResetTokenSentEvent);
    this.appLogger.logInfo({
      functionName: 'sendPasswordResetToken',
      message: `Password reset token sent to email: ${email} for userId: ${user.userId}`,
      userId: user.userId,
      additionalData: { email }
    });
  }

  async changePassword(resetToken:string,newPassword:string)
  {
    const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const user = await this.authUserRepository.findOne({passwordResetToken:hashedResetToken});
    if(user.passwordResetTokenExpiresAt < new Date())
      throw new ForbiddenException('Reset token expired plz request for new one');
    await this.authUserRepository.findOneAndUpdate({userId:user.userId},{
      password: await bcrypt.hash(newPassword,12),
      passwordResetToken: '',
      passwordResetTokenExpiresAt: new Date(0) as any,
    });
  }

  async updatePassword(userId:string,currentPassword:string,newPassword:string)
  {
    const user = await this.authUserRepository.findOne({userId});
    if(!await bcrypt.compare(currentPassword,user.password))
      throw new BadRequestException('Current password is incorrect');
    return this.authUserRepository.findOneAndUpdate({userId},{
      password: await bcrypt.hash(newPassword,12),
    });
  }

  async deleteAccount(userId:string)
  {
    await this.authUserRepository.findOneAndDelete({userId});
    this.kafka.emit<UserDeletedEvent>(KAFKA_TOPICS.USER_DELETED,{userId} as UserDeletedEvent);
    this.appLogger.logInfo({
      functionName: 'deleteAccount',
      message: `User account deleted for userId: ${userId}`,
      userId: userId,
    });
  }

  async updateEmail(userId:string,newEmail:string)
  {
    if (!this.isValidEmail(newEmail))
      throw new BadRequestException('Invalid email format');
    
    const existingUser = await this.authUserRepository.findOne({email: newEmail}).catch(() => null);
    if (existingUser)
      throw new BadRequestException('Email already in use');
    
    await this.authUserRepository.findOneAndUpdate({userId},{
      email: newEmail,
      isEmailConfirmed: false,
    });
    this.kafka.emit<UserEmailUpdatedEvent>(KAFKA_TOPICS.USER_EMAIL_UPDATED,{userId,email:newEmail} as UserEmailUpdatedEvent);
    this.appLogger.logInfo({
      functionName: 'updateEmail',
      message: `User email updated to ${newEmail} for userId: ${userId}`,
      userId: userId,
      additionalData: { newEmail }
    });
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  private signToken(userId:string,email:string,userRole:Roles,isEmailConfirmed:boolean)
  {
    return this.jwtService.sign({userId,email,role:userRole,isEmailConfirmed});
  }

}

