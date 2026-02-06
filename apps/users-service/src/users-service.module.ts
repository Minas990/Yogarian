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
  providers: [UsersService,JwtStrategy,JwtAuthGuard],
})
export class UsersServiceModule {}
