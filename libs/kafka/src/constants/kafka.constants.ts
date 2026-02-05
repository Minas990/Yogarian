export const KAFKA_BROKER = "localhost:9093";
export const KAFKA_CLIENT_ID = 'yoga';
export const KAFKA_CONSUMER_GROUP = 'yoga-consumer';

export const KAFKA_TOPICS = {
    USER_REGISTERED: 'user.registered',
    USER_LOGIN:'user.login',
    PASSWORD_RESET_REQUESTED:'user.password-reset-requested',

} as const;

export type KafkaTopics = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];