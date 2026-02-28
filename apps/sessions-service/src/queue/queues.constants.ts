export enum QUEUE_CONSTANTS {
    RUNNING_SESSIONS = 'running-sessions', // will change the state from upcoming to ongoing and from ongoing to completed
    COMPLETED_SESSIONS = 'completed-sessions', // will change the state from ongoing to completed
}