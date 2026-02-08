import { Controller } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { EventPattern } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { OtpSentEvent, PasswordResetTokenSentEvent, UserRegisteredEvent } from '@app/common';

@Controller()
export class NotificationsServiceController {
  constructor(private readonly emailService: EmailService) 
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async sendWelcomeEmail(data: UserRegisteredEvent)
  {
    return this.emailService.sendEmailFromTemplate(
      data.profile.email,
      'Welcome to Our Service',
      'welcomeEmail',
      { name: data.profile.name },
      data.profile.userId
    );
  }

  @EventPattern(KAFKA_TOPICS.OTP_SENT)
  async sendOTPEmail(data: OtpSentEvent)
  {
    return this.emailService.sendEmailFromTemplate(
      data.email,
      'Email Verification Code',
      'otpEmail',
      { otp: data.otp },
      data.userId
    );
  }
  @EventPattern(KAFKA_TOPICS.PASSWORD_RESET_TOKEN_SENT)
  async sendPasswordResetEmail(data: PasswordResetTokenSentEvent)
  {
    return this.emailService.sendEmailFromTemplate(
      data.email,
      'Password Reset Request',
      'passwordResetEmail',
      { resetToken: data.resetToken },
      data.userId
    );
  }

}
