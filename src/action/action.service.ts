import { Injectable } from '@nestjs/common';

@Injectable()
export class ActionService {
    public googleSheetIdentifyAction(actionDto: any): any {
        const actionId = actionDto.actionId;
        console.log('processing action for : ' + actionId);
        console.log({actionId});
        return "action processed";
      }
}
