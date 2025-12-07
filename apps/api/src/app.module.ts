import { Module } from '@nestjs/common';
import { AppController } from './controllers/app.controller';
import { AppService } from './services/app.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from '../mikro-orm.config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [MikroOrmModule.forRoot(mikroOrmConfig as any), UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
