export const KAFKA_BROKER = "localhost:9093";//default broker address for development and testing- **i'll deleted** 
export const KAFKA_SERVICE = 'KAFKA_SERVICE';//token name

export const KAFKA_TOPICS = {
    USER_REGISTERED: 'user.registered',
    USER_DELETED: 'user.deleted',
    USER_EMAIL_UPDATED: 'user.email.updated',
    OTP_SENT: 'otp.sent',
    PASSWORD_RESET_TOKEN_SENT: 'password.reset.token.sent',

    USER_PROFILE_UPDATED: 'user.profile.updated',
    USER_FOLLOW_EVENT: 'user.follow.event',
    USER_UNFOLLOW_EVENT: 'user.unfollow.event',

    IMAGE_USER_PROFILE_CREATED: 'image.user.profile.created',
    IMAGE_USER_PROFILE_DELETED: 'image.user.profile.deleted',
    IMAGE_USER_PROFILE_UPDATED: 'image.user.profile.updated',
    
    LOCATION_USER_CREATED: 'user.location.created',
    LOCATION_USER_UPDATED: 'user.location.updated',
    LOCATION_USER_DELETED: 'user.location.deleted',

    SESSION_CREATED: 'session.created',
    SESSION_DELETED: 'session.deleted',
    SESSION_UPDATED: 'session.updated',
    SESSION_CANCELLED: 'session.cancelled',//this for search service to listen for and update the session immediately to cancelled

    SESSIONS_ONGOING: 'sessions.ongoing',
    SESSIONS_COMPLETED: 'sessions.completed',

    SESSION_IMAGES_CREATION_APPROVED: 'session.images.creation.approved',
    SESSION_IMAGES_CREATION_REJECTED: 'session.images.creation.rejected',//for ownership verification
    SESSION_IMAGES_DELETION_APPROVED: 'session.images.deletion.approved',
    SESSION_IMAGES_DELETION_REJECTED: 'session.images.deletion.rejected',//for ownership verification

    IMAGES_SESSION_CREATED: 'images.session.created',
    IMAGES_SESSION_DELETED: 'images.session.deleted',
    
    NEW_SESSION_NOTIFICATION: 'new.session.notification',

    CHECK_SESSIONS_AVAILABLE_COMMAND: 'check.sessions.available.command',
    CHECK_SESSIONS_AVAILABLE_RESPONSE: 'check.sessions.available.response',
    CREATE_PAYMENT_CHECKOUT_COMMAND: 'create.payment.checkout.command',
    CREATE_PAYMENT_CHECKOUT_RESPONSE: 'create.payment.checkout.response',

    RESERVATION_CANCELLED: 'reservation.cancelled',

    PAYMENT_CONFIRMED: 'payment.confirmed',
    PAYMENT_FAILED: 'payment.failed',

    RESERVATION_CONFIRMED: 'reservation.confirmed',//for search service 

    REFUND_RESERVATION_COMMAND: 'refund.reservation.command',
    REFUND_RESERVATION_RESPONSE: 'refund.reservation.response',
    REFUND_RESERVATION_CONFIRMED: 'refund.reservation.confirmed',
    REFUND_RESERVATION_FAILED: 'refund.reservation.failed',
    CHECK_SESSION_UPCOMING_FOR_REFUND_COMMAND: 'check.session.upcoming.for.refund.command',
    CHECK_SESSION_UPCOMING_FOR_REFUND_RESPONSE: 'check.session.upcoming.for.refund.response',

    REFUND_ALL_USERS: 'refund.all.users',//for refunding all reservations for a session if it's upcoming, when the session is deleted
    ALL_USERS_REFUNDED: 'all.users.refunded',//after refunding all users for a session, we will emit this event to tell the sessions service to delete the session permanently
    NOTIFICATIONS_YOUR_SESSION_CANCELLED: 'notifications.your.session.cancelled',
    SESSION_CANCELLED_NOTIFICATION: 'session.cancelled.notification',
    
    //removed location creation/update events for gRPC migration
} as const;

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];