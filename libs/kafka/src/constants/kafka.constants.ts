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
    
    SESSION_IMAGES_CREATION_APPROVED: 'session.images.creation.approved',
    SESSION_IMAGES_CREATION_REJECTED: 'session.images.creation.rejected',//for ownership verification
    SESSION_IMAGES_DELETION_APPROVED: 'session.images.deletion.approved',
    SESSION_IMAGES_DELETION_REJECTED: 'session.images.deletion.rejected',//for ownership verification

    IMAGES_SESSION_CREATED: 'images.session.created',
    IMAGES_SESSION_DELETED: 'images.session.deleted',

    NEAREST_USERS_FOUND: 'nearest.users.found',
    NEW_SESSION_NOTIFICATION: 'new.session.notification',
    //removed location creation/update events for gRPC migration
} as const;

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];