import { Module } from '@nestjs/common';
import { GooglesheetService } from './googlesheet.service';
import { GooglesheetController } from './googlesheet.controller';
import { GoogleauthService } from 'src/googleauth/googleauth.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Token } from 'src/token/entities/token.entity';
import { Triggers } from 'src/triggers/entities/triggers.entity';

@Module({
  controllers: [GooglesheetController],
  providers: [GooglesheetService, GoogleauthService],
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Token, Triggers]),
  ],
})
export class GooglesheetModule {}
