import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { AuthModule } from '@modules/auth/auth.module';
import { CommonModule } from '@common/modules/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    forwardRef(()=>AuthModule) ,
    CommonModule,
    
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {} 