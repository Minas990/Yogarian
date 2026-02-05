export const KAFKA_BROKER = "localhost:9093";//default broker address for development and testing- **i'll deleted** 
export const KAFKA_SERVICE = 'KAFKA_SERVICE';//token name

export const KAFKA_TOPICS = {
    USER_REGISTERED: 'user.registered',
    USER_LOGIN:'user.login',
    PASSWORD_RESET_REQUESTED:'user.password-reset-requested',

} as const;

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];