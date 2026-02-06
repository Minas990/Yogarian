import { Body, Controller, Get, Post, Res, UseInterceptors, UploadedFile, Delete, UseGuards, Param, BadRequestException, Patch } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { CreateUserDto, CurrentUser, JwtAuthGuard, type UserTokenPayload } from '@app/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {type Response } from 'express';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}


  @UseInterceptors(FileInterceptor('file'))
  @Post('signup')
  async signUp(@Body() user: CreateUserDto, @UploadedFile() file: Express.Multer.File)
  {
    return this.authServiceService.signUp(user,file);
  }

  @Post('login')
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
      }
    }
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post('confirmEmail')
  async confirmEmail(@CurrentUser() user : UserTokenPayload, @Body() body: {otp: string},@Res({passthrough:true}) res: Response)
  {
    await this.authServiceService.confirmEmail(user.userId,body.otp);
    res.clearCookie('jwt');
    return {
      message:'Email confirmed successfully'
    }
  }

  @Post('forgetPassword')
  async forgetPassword(@Body('email') email: string)
  {
    await this.authServiceService.sendPasswordResetToken(email);
    return {
      message:'Password reset token sent to your email'
    }
  }

  @Patch('changePassword/:resetToken')
  async changePassword(@Body('newPassword') newPassword: string, @Param('resetToken') resetToken: string)
  {
    await this.authServiceService.changePassword(resetToken,newPassword);
    return {
      message:'Password changed successfully'
    }
  }


  @UseGuards(JwtAuthGuard)
  @Patch('updatePassword')
  async updatePassword(@CurrentUser() user : UserTokenPayload,@Body('currentPassword') currentPassword: string, @Body('newPassword') newPassword: string,@Res({passthrough:true}) res: Response)
  {
    await this.authServiceService.updatePassword(user.userId,currentPassword,newPassword);
    res.clearCookie('jwt');
    return {
      message:'Password updated successfully- please log in again',
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('updateEmail')
  async updateEmail(@CurrentUser() user : UserTokenPayload,@Body('newEmail') newEmail: string,@Res({passthrough:true}) res: Response)
  {
    await this.authServiceService.updateEmail(user.userId,newEmail);
    res.clearCookie('jwt');
    return {
      message:'Email updated successfully- please log in again',
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete('')
  async deleteAccount(@CurrentUser() user : UserTokenPayload)
   {
     await this.authServiceService.deleteAccount(user.userId);
     return {
      message:'Account deleted successfully'
     }
   }
}
