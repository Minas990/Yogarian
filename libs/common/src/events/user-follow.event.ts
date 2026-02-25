export class UserFollowEvent {
    followerId: string
    followingId: string
    createdAt: Date
    constructor(partial: Partial<UserFollowEvent>) {
        Object.assign(this, partial);
    }
}