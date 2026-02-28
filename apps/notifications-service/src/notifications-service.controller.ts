import { Controller } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { EventPattern } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '@app/kafka';
import { OtpSentEvent, PasswordResetTokenSentEvent, UserRegisteredEvent } from '@app/common';
import { SessionNotifyEvent } from '@app/common/events/session-notify.event';
import { NotificationsService } from './notifications-service.service';

@Controller()
export class NotificationsServiceController {
  constructor(private readonly emailService: EmailService,
    private readonly notiService: NotificationsService
  ) 
  {

  }

  @EventPattern(KAFKA_TOPICS.USER_REGISTERED)
  async sendWelcomeEmail(data: UserRegisteredEvent)
  {
    return this.emailService.sendEmailFromTemplate(
      data.email,
      'Welcome to Our Service',
      'welcomeEmail',
      { name: data.name },
      data.userId
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

  @EventPattern(KAFKA_TOPICS.NEW_SESSION_NOTIFICATION)
  async handleNewSession(event: SessionNotifyEvent): Promise<void> {
    try {
      await this.notiService.createEventWithTasks(
        {
          eventId: event.eventId,
          eventType: KAFKA_TOPICS.NEW_SESSION_NOTIFICATION,
          emitter: event.trainerId,
          payload: event,
        },
        event.users.map(email => ({
          email,
          subject: 'New Session Available',
          templateName: 'newSessionNotification',
          userId: event.trainerId,
          priority: 2,
          payload: {
            message: event.message,
            sessionId: event.sessionId,
            title: event.title,
            startTime: String(event.startTime),
            price: event.price.toString(),
            address: event.address,
            trainerName: event.trainerName,
            trainerId: event.trainerId,
          },
        }))
      );
    } 
    catch (error) {
      if (error.code === '23505') 
        return; 
      console.error('Error creating notification event and tasks:', error);//for testing , ill not throw error to avoid retries, but in production we should handle it properly
    }
  }

}
