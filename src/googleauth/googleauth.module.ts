import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoogleauthService } from './googleauth.service';
import { Token } from 'src/token/entities/token.entity';
import { GoogleauthController } from './googleauth.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Token])],
  controllers: [GoogleauthController],
  providers: [GoogleauthService]
})
export class GoogleauthModule {}
