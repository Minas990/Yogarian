import { Injectable } from '@nestjs/common';
import { Follow } from '../models/follow.model';
import { FollowRepository } from '../repos/follow.repository';

@Injectable()
export class FollowService {
    constructor(
        private readonly followRepo:FollowRepository )
    {
        
    }
    async followUser(userId:number,followedId:number)
    {
        const follow = new Follow({
            followerId: userId,
            followingId: followedId,
        });
        return this.followRepo.create(follow);
    }

    async unfollowUser(userId:number,followedId:number)
    {
        return this.followRepo.findOneAndDelete({ followerId: userId, followingId: followedId });
    }
    
}
