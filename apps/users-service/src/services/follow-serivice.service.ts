import { Inject, Injectable } from '@nestjs/common';
import { Follow } from '../models/follow.model';
import { FollowRepository } from '../repos/follow.repository';
import { KAFKA_SERVICE, KAFKA_TOPICS } from '@app/kafka';
import { ClientKafka } from '@nestjs/microservices';
import { UserFollowEvent } from '@app/common/events/user-follow.event';

@Injectable()
export class FollowService {
    constructor(
        private readonly followRepo:FollowRepository,
        @Inject(KAFKA_SERVICE) private readonly kafkaClient: ClientKafka
     )
    {
        
    }
    async followUser(userId:string,followedId:string)
    {
        const follow = new Follow({
            followerId: userId,
            followingId: followedId,
        });
        const result = await this.followRepo.create(follow);
        const event = new UserFollowEvent({createdAt: result.createdAt, followerId: userId, followingId: followedId});
        this.kafkaClient.emit(KAFKA_TOPICS.USER_FOLLOW_EVENT, event);
        return result;
    }

    async unfollowUser(userId:string,followedId:string)
    {
        const result =  this.followRepo.findOneAndDelete({ followerId: userId, followingId: followedId });
        const event = new UserFollowEvent({createdAt: new Date(), followerId: userId, followingId: followedId});
        this.kafkaClient.emit(KAFKA_TOPICS.USER_UNFOLLOW_EVENT, event);
        return result;
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
