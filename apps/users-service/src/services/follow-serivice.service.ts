import { Inject, Injectable } from '@nestjs/common';
import { Follow } from '../models/follow.model';
import { FollowRepository } from '../repos/follow.repository';

@Injectable()
export class FollowService {
    constructor(
        private readonly followRepo:FollowRepository,
     )
    {
        
    }
    async followUser(userId:string,followedId:string)
    {
        const follow = new Follow({
            followerId: userId,
            followingId: followedId,
        });
        return this.followRepo.create(follow);
    }

    async unfollowUser(userId:string,followedId:string)
    {
        return this.followRepo.findOneAndDelete({ followerId: userId, followingId: followedId });
    }
 
    async getMyFollowers(followingId:string)
    {
        return this.followRepo.find({followingId});
    }

    async getMyFollowing(followerId:string)
    {
        return this.followRepo.find({followerId});
    }
    
}
