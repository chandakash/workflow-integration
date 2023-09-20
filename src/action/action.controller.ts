import { Body, Controller, Post } from '@nestjs/common';
import { ActionService } from './action.service';

@Controller('action')
export class ActionController {
  constructor(private readonly actionService: ActionService) {}

    @Post("/googlesheet")
    async googleSheetAction(@Body() actionDto: any) {
      const response = await this.actionService.googleSheetIdentifyAction(actionDto);
      return response;
    }
}
