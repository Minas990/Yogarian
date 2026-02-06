import { Body, Controller, Get, Post, Res, UseInterceptors, UploadedFile, Delete, UseGuards } from '@nestjs/common';
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
  @Delete('')
  async deleteAccount(@CurrentUser() user : UserTokenPayload)
   {
     await this.authServiceService.deleteAccount(user.userId);
     return {
      message:'Account deleted successfully'
     }
   }
}
