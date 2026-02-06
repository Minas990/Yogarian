import { Module } from '@nestjs/common';
import { UserController } from './users-service.controller';
import { UsersService } from './services/users-service.service';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from '@app/kafka';
import { DatabaseModule } from '@app/database';
import { User } from './models/user.model';
import { Follow } from './models/follow.model';
import { JwtStrategy } from '@app/common/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '@app/common/auth/guards/jwt-auth.guard';
import { Photo } from './models/photo.model';
import { UserRepository } from './repos/user.repostiroy';
import { FollowRepository } from './repos/follow.repository';
import { PhotoRepository } from './repos/photo.repository';
import { FollowService } from './services/follow-serivice.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:['.env','./apps/users-service/.env'],
    }),
    KafkaModule.register(),
    DatabaseModule,
    DatabaseModule.forFeature([User,Follow,Photo]),
  ],
  controllers: [UserController],
  providers: [UsersService ,FollowService,JwtStrategy,JwtAuthGuard,UserRepository,FollowRepository,PhotoRepository],
})
export class UsersServiceModule {}
