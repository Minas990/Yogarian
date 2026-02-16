import { Queue } from "bullmq";
import { QUEUE_CONSTANTS } from "../constants/queue.constants";

export const REDIS_OPTION = { host: 'localhost', port: 6379 };

export const cleanupQueue = new Queue(QUEUE_CONSTANTS.UNCONFIRMED_EMAIL_CLEANUP_QUEUE, {
    connection: REDIS_OPTION
});


export async function scheduleCleanupJob() {
    const existingRepeatables = await cleanupQueue.getRepeatableJobs();
    for (const job of existingRepeatables) {
        await cleanupQueue.removeRepeatableByKey(job.key);
    }

    await cleanupQueue.add(
        'cleanup-unconfirmed-users',
        {},
        {
            repeat: {
                every: 30000,//30 seconds for LOAD TESTING (change back to 120000 for production) 
            },
            removeOnComplete: true,
            removeOnFail: false,
        }
    );
    console.log('scheduled unconfirmed user cleanup job to run every 30 seconds (LOAD TESTING)');
}