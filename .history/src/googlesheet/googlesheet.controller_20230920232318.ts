import { writeRangeDto } from './../common/interfaces';
import {JWT} from "google-auth-library";
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Put } from '@nestjs/common';
import { GooglesheetService } from './googlesheet.service';
import { GoogleauthService } from 'src/googleauth/googleauth.service';

@Controller('googlesheet')
export class GooglesheetController {
  private readonly _jwtClient: any;
  constructor(private readonly googlesheetService: GooglesheetService, private readonly googleauthService: GoogleauthService) {
    this._jwtClient = this.googleauthService.getClient("akash");
  }

  @Post("/create")
  async createSpreadSheet(@Body() createDto: any) {
    const updatedJwtClient = await this.googleauthService.updateClientToken(createDto.userId, this._jwtClient);
    console.log({updatedJwtClient});
    return this.googlesheetService.createSpreadsheet(createDto.title, updatedJwtClient);
  }

  @Post("/addSheet")
  addSheetToSpreadSheet(@Body() addSheetDto: any) {
    return this.googlesheetService.addSheetToSpreadSheet(addSheetDto.spreadsheetId, addSheetDto.title, this._jwtClient);
  }

  @Get("/readAll")
  read(@Query('spreadsheetId') spreadsheetId: string) {
    return this.googlesheetService.readAllSheet(spreadsheetId, this._jwtClient);
  }

  @Put("/writeRange")
  writeRange(@Body() writeRangeDto: writeRangeDto) {
    console.log('writing range')
    return this.googlesheetService.writeRange(writeRangeDto.spreadsheetId, writeRangeDto.range, writeRangeDto.values, this._jwtClient);
  }

  @Delete("/deleteRange")
  deleteRange(@Body() deleteRangeDto: any) {
    return this.googlesheetService.deleteRange(deleteRangeDto.spreadsheetId, deleteRangeDto.range, this._jwtClient);
  }

  @Post('/driveRevisions')
  driveRevision(@Body() driveRevisionsDto: any){
    return this.googlesheetService.driveRevisions(driveRevisionsDto, this._jwtClient);
  }

  @Post("/trigger")
  createTrigger(@Body() triggerDto: any){
    return this.googlesheetService.createTrigger(triggerDto);
  }

  @Post("/event")
  async googleEvent(@Body() eventData: any): Promise<string> {
    console.log("event is received");
    console.log(eventData);

    const updatedJwtClient = await this.googleauthService.updateClientToken(eventData.userId, this._jwtClient);
    // const token = (await updatedJwtClient.getAccessToken()).token;
    await this.googlesheetService.googleEvent(eventData, updatedJwtClient);
    return "event is processed successfully";
  }


  // @Get()
  // findAll() {
  //   return this.googlesheetService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.googlesheetService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateGooglesheetDto: any) {
  //   return this.googlesheetService.update(+id, updateGooglesheetDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.googlesheetService.remove(+id);
  // }
}
