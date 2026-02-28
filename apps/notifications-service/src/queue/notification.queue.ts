import { Queue } from "bullmq";
import { QUEUE_CONSTANTS } from "./constants.queue";



export const notificationQueue = new Queue(QUEUE_CONSTANTS.NOTIFICATIONS_QUEUE);
