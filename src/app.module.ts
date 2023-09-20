import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GooglesheetModule } from './googlesheet/googlesheet.module';
import { GoogleauthModule } from './googleauth/googleauth.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// import { AuthModule } from './auth/auth.module';
import { ActionModule } from './action/action.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.PG_HOST,
      port: 5432,
      // driver: 'pg',
      username: process.env.PG_USER,
      password: process.env.PG_PASSWORD,
      database: process.env.PG_DATABASE,
      synchronize: true,
      ssl: true,
      autoLoadEntities: true,
    }),GooglesheetModule, GoogleauthModule, ActionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
