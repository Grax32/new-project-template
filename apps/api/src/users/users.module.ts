import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { User } from '../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
    imports: [MikroOrmModule.forFeature([User])],
    providers: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
