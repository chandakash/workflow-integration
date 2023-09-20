import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // @Get("/auth/google/callback")
  // getAuthCode(@Query("code") code: any): string {
  //   console.log(`receceived auth code: ${JSON.stringify(code)}`)
  //   this.googleService.
  //   return this.appService.getHello();
  // }
}
