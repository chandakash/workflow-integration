import { Controller, Get, Query } from '@nestjs/common';
import { GoogleauthService } from './googleauth.service';

@Controller('auth')
export class GoogleauthController {
  constructor(private readonly googleauthService: GoogleauthService) {}

  @Get("google/callback")
  async getAuthCode(@Query("code") code: string, @Query("state") stateJSONData: any): Promise<string> {
    console.log(`received auth code: ${JSON.stringify(code)}`)
    const stateData = JSON.parse(stateJSONData);
    const userId = stateData.userId;
    console.log(`userId: ${JSON.stringify(userId)}`);
    await this.googleauthService.storeAuthCode(userId, code);
    return `token fetched successfully`;
  }
}
