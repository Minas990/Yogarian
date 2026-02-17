export const KAFKA_BROKER = "localhost:9093";//default broker address for development and testing- **i'll deleted** 
export const KAFKA_SERVICE = 'KAFKA_SERVICE';//token name

export const KAFKA_TOPICS = {
    USER_REGISTERED: 'user.registered',
    USER_DELETED: 'user.deleted',
    USER_EMAIL_UPDATED: 'user.email.updated',
    OTP_SENT: 'otp.sent',
    PASSWORD_RESET_TOKEN_SENT: 'password.reset.token.sent',
    SESSION_CREATED: 'session.created',
    SESSION_DELETED: 'session.deleted',
    SESSION_UPDATED: 'session.updated',
    LOCATION_CREATION_FAILED: 'location.creation.failed',
    LOCATION_UPDATE_FAILED: 'location.update.failed',
} as const;

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];