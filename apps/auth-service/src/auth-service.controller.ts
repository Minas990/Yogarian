import { Body, Controller, Get, Post, Res, UseInterceptors, UploadedFile, Delete, UseGuards, Param, BadRequestException, Patch } from '@nestjs/common';
import { CurrentUser, EmailConfirmedGuard, JwtAuthGuard, type UserTokenPayload } from '@app/common';
import { AuthServiceService } from './auth-service.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { CreateUserDto } from './dtos/create-user.dto';
import { SensitiveThrottleGuard, ShortThrottleGuard } from './guards/rate-limit.guard';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  
  @UseInterceptors(FileInterceptor('file'))
  @Post('signup')
  @UseGuards(ShortThrottleGuard)
  async signUp(@Body() user: CreateUserDto, @UploadedFile() file: Express.Multer.File)
  {
    if(!file)
      throw new BadRequestException('Profile photo is required');
    return this.authServiceService.signUp(user,file);
  }

  @Post('login')
  @UseGuards(ShortThrottleGuard)
  async logIn(@Body('email') email: string, @Body('password') password: string, @Res({passthrough:true}) res: Response)
  {
    const  {token,user} = await this.authServiceService.logIn(email,password);
    
    res.cookie('jwt',token,{
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return {
      message:'Login successful',
      user: {
        userId: user.userId,
      },
      token
    }
  }

  @UseGuards(JwtAuthGuard, SensitiveThrottleGuard)
  @Post('sendOtp')
  async sendOtp(@CurrentUser() user : UserTokenPayload)
  {
    if(user.isEmailConfirmed)
      throw new BadRequestException('Email is already confirmed');
    await this.authServiceService.sendOtp(user.userId,user.email);
    return {
      message:'OTP sent to your email'
    }
  }

  @UseGuards(JwtAuthGuard, ShortThrottleGuard)
  @Post('confirmEmail')
  async confirmEmail(@CurrentUser() user : UserTokenPayload, @Body('otp') otp:string,@Res({passthrough:true}) res: Response)
  {
    if(!otp)
      throw new BadRequestException('where is your otp??');
    await this.authServiceService.confirmEmail(user.userId,otp);
    res.clearCookie('jwt');
    return {
      message:'Email confirmed successfully'
    }
  }

  @Post('forgetPassword')
  @UseGuards(SensitiveThrottleGuard)
  async forgetPassword(@Body('email') email: string)
  {
    if(!email)
      throw new BadRequestException('Email is required');
    await this.authServiceService.sendPasswordResetToken(email);
    return {
      message:'Password reset token sent to your email'
    }
  }

  @Patch('changePassword/:resetToken')
  @UseGuards(SensitiveThrottleGuard)
  async changePassword(@Body('newPassword') newPassword: string, @Param('resetToken') resetToken: string)
  {
    if(!newPassword || !resetToken)
      throw new BadRequestException('New password and reset token are required');
    await this.authServiceService.changePassword(resetToken,newPassword);
    return {
      message:'Password changed successfully'
    }
  }


  @UseGuards(JwtAuthGuard, ShortThrottleGuard)
  @Patch('updatePassword')
  async updatePassword(@CurrentUser() user : UserTokenPayload,@Body('currentPassword') currentPassword: string, @Body('newPassword') newPassword: string,@Res({passthrough:true}) res: Response)
  {
    if(!currentPassword || !newPassword)
      throw new BadRequestException('Current password and new password are required');
    await this.authServiceService.updatePassword(user.userId,currentPassword,newPassword);
    res.clearCookie('jwt');
    return {
      message:'Password updated successfully- please log in again',
    }
  }

  @UseGuards(JwtAuthGuard, EmailConfirmedGuard, ShortThrottleGuard)
  @Patch('updateEmail')
  async updateEmail(@CurrentUser() user : UserTokenPayload,@Body('newEmail') newEmail: string,@Res({passthrough:true}) res: Response)
  {
    if(!newEmail)
      throw new BadRequestException('New email is required');
    if(newEmail === user.email)
      throw new BadRequestException("what is the point of updating ur email by ur current email??");
    await this.authServiceService.updateEmail(user.userId,newEmail);
    res.clearCookie('jwt');
    return {
      message:'Email updated successfully- please log in again',
    }
  }

  @UseGuards(JwtAuthGuard,EmailConfirmedGuard)
  @Delete('')
  async deleteAccount(@CurrentUser() user : UserTokenPayload)
   {
     await this.authServiceService.deleteAccount(user.userId);
     return {
      message:'Account deleted successfully'
     }
   }
}
