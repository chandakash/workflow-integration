import { Injectable } from '@nestjs/common';
import { JWT, OAuth2Client } from 'google-auth-library';
// import {GaxiosPromise, JWT} from "googleapis-common";
// import { GaxiosPromise } from 'googleapis/build/src/apis/abusiveexperiencereport';
import { GaxiosPromise } from 'googleapis/node_modules/googleapis-common';
import { drive_v2, drive_v3, google, sheets_v4 } from 'googleapis';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Triggers } from 'src/triggers/entities/triggers.entity';
import { Repository } from 'typeorm';
import {
  BINARY_MIME_TYPE,
  compareRevisions,
  getRevisionFile,
  sheetBinaryToArrayOfArrays,
} from 'src/common/googlesheet.helpers';
import { GSHEET_EVENT_SOURCE, TRIGGER_APP_NAME } from 'src/common/enums';

@Injectable()
export class GooglesheetService {
  constructor(
    @InjectRepository(Triggers)
    private readonly triggerRepository: Repository<Triggers>,
  ) {}

  /**
   * Create a new spreadsheet
   *
   * @param title
   *
   * @returns Promise<string>
   */
  async createSpreadsheet(title: string, jwtClient: any): Promise<any> {
    console.log('fetching token');

    const sheets = this.getGoogleSheetConnect(jwtClient);
    const drive = this.getGoogleDriveConnect(jwtClient);
    const sheetRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title,
        },
      },
    });

    const driveRes = await drive.permissions.create({
      fileId: sheetRes.data.spreadsheetId,
      requestBody: {
        role: 'writer',
        type: 'anyone',
      },
    });

    //obtain the webview and webcontent links
    const result = await drive.files.get({
      fileId: sheetRes.data.spreadsheetId,
      fields: 'webViewLink, webContentLink',
      // [transferOwnership: true]
    });
    console.log(result.data);

    await this.addSheetToSpreadSheet(
      sheetRes.data.spreadsheetId,
      'Change_Log',
      jwtClient,
    );
    // await this.callAppsScript(title, sheetRes.data.spreadsheetId, jwtClient, "Sheet1");
    console.log('add watch to sheet');
    await this.writeRange(
      sheetRes.data.spreadsheetId,
      'Change_Log!A1',
      [
        [
          `=watchFunction(Sheet1!A:Z) & " - " & TEXT(NOW(), "yyyy-mm-dd hh:mm:ss")`,
        ],
      ],
      jwtClient,
    );
    return {
      sheetRes: sheetRes.data,
      driveRes: result.data,
    };
  }

  /**
   * Add a new sheet to spreadsheet
   *
   * @param title
   *
   * @returns Promise<string>
   */
  async addSheetToSpreadSheet(
    spreadsheetId: string,
    title: string,
    jwtClient: JWT,
  ): Promise<any> {
    const sheets = this.getGoogleSheetConnect(jwtClient);

    const sheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: title,
              },
            },
          },
        ],
      },
    });

    return sheetRes.data;
  }

  /**
   * Read a spreadsheet
   *
   * @param spreadsheetId
   *
   * @returns {Promise<sheets_v4.Schema$Sheet[]>}
   */
  async readAllSheet(
    spreadsheetId: string,
    jwtClient: JWT,
  ): Promise<sheets_v4.Schema$Sheet[]> {
    const sheets = this.getGoogleSheetConnect(jwtClient);
    const res = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
      includeGridData: true,
    });

    return res.data.sheets;
  }

  /**
   * Write a range of cells to a spreadsheet
   *
   * @param spreadsheetId
   * @param range
   * @param values
   *
   * @returns {GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse>}
   */
  async writeRange(
    spreadsheetId: string,
    range: string,
    values: any[][],
    jwtClient: JWT,
  ): GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse> {
    // const auth = this.getAuth();
    const sheets = this.getGoogleSheetConnect(jwtClient);
    console.log({ sheets });
    return await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values,
      },
    } as any);
  }

  /**
   * delete a range of cells from a spreadsheet
   *
   * @param spreadsheetId
   * @param range
   * @param values
   *
   * @returns {GaxiosPromise<sheets_v4.Schema$UpdateValuesResponse>}
   */
  async deleteRange(
    spreadsheetId: string,
    range: string,
    jwtClient: JWT,
  ): GaxiosPromise<sheets_v4.Schema$ClearValuesResponse> {
    // const auth = this.getAuth();
    const sheets = this.getGoogleSheetConnect(jwtClient);
    console.log({ sheets });
    return await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });
  }

  public async callAppsScript(
    title: string,
    spreadsheetId: string,
    jwtClient: any,
    sheetId?: any,
    userId?: any
  ): Promise<any> {
    const script = google.script({ version: 'v1', auth: jwtClient });

    let res = await script.projects.create({
      requestBody: {
        title: 'Trigger Script',
        parentId: spreadsheetId,
      },
    });

    res = await script.projects.updateContent({
      scriptId: res.data.scriptId,
      requestBody: {
        files: [
          {
            name: title,
            type: 'SERVER_JS',
            source: `

            function watchFunction(e) {
              const data = {
                // eventData: e,
                documentId: ${spreadsheetId},
                sheetId: ${sheetId},
                userId: ${userId}
              }
              var options = {
                'method' : 'post',
                'contentType': 'application/json',
                'payload' : JSON.stringify(data)
              };
              var url = 'https://7ff8-116-72-197-101.ngrok-free.app/googlesheet/event'; // TODO: update this ngrok url.
              var response = UrlFetchApp.fetch(url, options);
              return 'sheet 1 is updated at :'
            }
            `,
          },
          {
            name: 'appsscript',
            type: 'JSON',
            source: `{"timeZone":"Asia/Kolkata","exceptionLogging":"CLOUD","oauthScopes":["https://www.googleapis.com/auth/spreadsheets","https://www.googleapis.com/auth/script.projects","https://www.googleapis.com/auth/script.deployments","https://www.googleapis.com/auth/script.scriptapp","https://www.googleapis.com/auth/script.webapp.deploy","https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/drive.scripts", "https://www.googleapis.com/auth/script.external_request"],"webapp":{"executeAs":"USER_DEPLOYING","access":"ANYONE_ANONYMOUS"}}`,
          },
        ],
      },
    });

    console.log(`https://script.google.com/d/${res.data.scriptId}/edit`);
    // console.log('creating version');
    const version = await script.projects.versions.create({
      scriptId: res.data.scriptId,
      requestBody: {
        description: 'latest test version',
        // manifestFileName: 'appsscript.json'
      },
    });
    console.log({ version });

    console.log('creating deploymentns');
    const depRes = await script.projects.deployments.create({
      scriptId: res.data.scriptId,
      requestBody: {
        versionNumber: 1,
        // manifestFileName: 'appsscript',
      },
    });
    console.log({ depRes });

    // try {
    //   const runRes = await script.scripts.run({
    //     // scriptId: depRes.data.deploymentId,
    //     scriptId: res.data.scriptId,
    //     requestBody: {
    //       function: `saveAndDeployNewVersion`,
    //     },
    //   });
    //   console.log(res.data);
    //   return runRes.data;
    // } catch (err) {
    //   console.error(
    //     `error occurred while running appsscript: ${JSON.stringify(err)}`,
    //   );
    //   return {
    //     error: err.message,
    //   };
    // }
  }

  // @Cron(CronExpression.EVERY_5_SECONDS)
  // handleCron() {
  //   console.debug('Called when the current second is 5');
  // }

  async driveRevisions(
    driveRevisionDto: any,
    jwtClient: any,
  ): GaxiosPromise<any> {
    // const auth = this.getAuth();

    // const { tokens } = await jwtClient.getToken("4/0Adeu5BWwYtvDfhZTJkiLStq2ZPPkyJ4COymku-__Jfz_CVVqRuYltypS01dtvEvh4Hy-1A");
    // console.log({ tokens });
    // jwtClient.credentials = tokens;

    const drive = this.getGoogleDriveConnect(jwtClient);
    return await drive.revisions.list({
      fileId: driveRevisionDto.fileId,
    });
  }

  /**
   * Get Google Sheet Connection
   *
   * @returns sheets_v4.Sheets
   */
  public getGoogleSheetConnect(jwtClient: any): sheets_v4.Sheets {
    // const client = await auth.getClient();
    return google.sheets({ version: 'v4', auth: jwtClient });
  }

  public getGoogleDriveConnect(jwtClient: any): drive_v3.Drive {
    // const client = await auth.getClient();
    return google.drive({
      version: 'v3',
      auth: jwtClient,
    });
  }

  public getGoogleDriveV2Connect(jwtClient: any): drive_v2.Drive {
    // const client = await auth.getClient();
    return google.drive({
      version: 'v2',
      auth: jwtClient,
    });
  }

  // public getAuth(): any {
  //   const auth = new google.auth.JWT({
  //     // keyFile: 'serviceAccountKey.json',
  //     email: 'sheet-integration@integrations-394117.iam.gserviceaccount.com',
  //     key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEP1yVtFDM8dae\nOFqoKL+u1SP7b48WoU/3af27VwDohuHhT8FHMr9zTyz7VaUPYKBlku91EhpKOfP6\nMDUioeAxlVAg90qDs8NSYRgnSuRypNYSLfT8UelsxvxRuykThLN7Iba4dhAEGuwm\nSsOIap03QBntBJZdL33BWFPIE2/Mki7it9i7trzr3QkaZP1D6spu/wAoQ5cg6x1x\nL13xqwAJI6xlXiqu74O7xoKmu3rRoILKl8DruO/EPZ3bGkXzSythJxHjPxZuDD+r\n25uohFM4fkLaEAboW4u3tcLGOaIDAN7w2s3zCI0HqxjdCMmWuXuMSIR/gF9kU/OO\nHZBz1K7zAgMBAAECggEAGB/z6UFj53XZXNTvrBlqSvtPs5Kow+7rri4c74FIDs26\nCeEskOyXpXy3umPyaRwHS8VO45Ton3RVXk270niU33OMCKltwxf/rGpcNkRaJg/G\nczCsG7KUH/esP/3ilFAtYjcoR6/X0zFeE20AcY4tqoOaTE1SkL0MWA7cKc3d4gdk\n93NqfFf9pkP+jkXSsOnL1YsQkN35uaumEeln2box+FPDc0aVuEVJIr8x/D+9Mutk\nO8pXnOAh18flLrTPvfEWhtrZ0tUtChe9fXbRS9d/5CyH4duzj4L2EsrNsmm275nB\nPfqAJWzylDOeIyJNsC/P4CeCWGSqTs9H88vRULjKiQKBgQD8JiKIy8H/DCrxj9zb\nYyvbtsfxjsTb45dWGIx9NnVbgKNPqoOJDe7lSkiK08h7t8bktAok7+oENK4wPxyw\nidR+SEuIrfiOkPyTrj4tDoIYTBnQzTuV4hfvy7vnWH6Jpy4gLiM/WWIOqDHhgjav\nc9l/aE8c3lyf6JDl7LvesY1QqQKBgQDHPqkMAj5drlPmHyJXJGV+BEXsrmr+7sxD\nmk0fg/99p7KXMhtPipGVBVVV6c36xkLy4B6CUWNWRBXvdQCKWJSL1HLYe3vSiyKH\nLBO1WEmTKKAeRv4N4LyHQnUJGWKnEZbijGOR+INt3Fx25d9fwcC7TbMBiaAYaIDK\n9nfSkOFYOwKBgQCxXdHlEA9CbTi3+06MNFJhl01GKftoAcwuj84jNe+PkglOvM8R\n1W86cupcXWUlQbzym4KXQPwIQVZWMc7oj8udmRUo69dv0aUZ7PNnllEE7mMqcXN8\nlzHnSBTBQ4qfIa5cjJfWs/U6Ai40RvhYqtFPwfwEfpYBFgL2+XOdzp9tIQKBgBD2\nEZf3HO4GqBe/8MFwVL98h6NVWcBn/bWHjicvqnE89GQQnOiRiEEiWhhdNe6yMALS\n92XqncU7OI7Q7AHa9pJMvJYXNPxAYekV5Hucj27al37cVkZCKmptSt9CbPaB9dFF\nWDiV6kJQ7wIkIXbaXJjVTXbFC37oboZYouym7rf/AoGAe+0TRYyGT9pvR9odzrtj\nF6FPbLrCMAObtTDYKAVl+0BdB/woti6fxqXgxnIjYOR3Nw8owHHcSXojkab+VCkF\nFguopbWP48pN/zIN+hngsNDFe8jbMcpyAq0Ae+mR4+8p6BX81MyRyu5ZB0M3LBRJ\nEmqrpBh6l3jRRHKmq2XMrPE=\n-----END PRIVATE KEY-----\n',
  //     scopes: 'https://www.googleapis.com/auth/spreadsheets',
  //   });
  //   return auth;
  // }

  public async googleEvent(data: any, authClient: OAuth2Client): Promise<any> {
    const access_token = (await authClient.getAccessToken()).token;
    let isRowAdded = false;
    let rowAddedTrigger = {} as Triggers;
    let previousRevisionSheetData = [];
    console.log({ access_token });

    console.log({ data });

    const triggers = await this.getTrigger(data.userId);
    console.log({ triggers });

    const { documentId, sheetId } = data;
    const drive = this.getGoogleDriveV2Connect(authClient);

    const revisionLists = await drive.revisions.list({
      fileId: documentId,
    });

    console.log({ revisionLists });
    console.log(revisionLists.data);
    // console.log("revision data: %j", revisionLists.data);

    if (triggers.length > 0) {
      try {
        const revisionData = await drive.revisions.get({
          fileId: documentId,
          revisionId: triggers[0].triggerId.toString() ?? '1',
        });
        console.log({ revisionData });
        console.log('fetching previous revision');
        const previousRevision = await getRevisionFile(
          access_token,
          triggers[0].appConfig.googlesheet.lastRevisionLink,
        );
        console.log({ previousRevision });
        previousRevisionSheetData =
          sheetBinaryToArrayOfArrays(
            previousRevision,
            sheetId as string,
            undefined,
          ) || [];

        for (const trigger of triggers) {
          if (trigger.eventSource === GSHEET_EVENT_SOURCE.ROW_ADDED) {
            isRowAdded = true;
            rowAddedTrigger = trigger;
          }
        }
        console.log({ previousRevisionSheetData });
      } catch (err) {
        console.log('error while fetching previous revision');
        console.log(err);
      }
    }

    const totalRevisions = revisionLists.data.items.length;
    const latestRevisions = revisionLists.data.items[totalRevisions - 1];
    console.log({ latestRevisions });
    // save the latest revision. for more than 30 days.
    const updatedRevision = await drive.revisions.update({
      fileId: documentId,
      revisionId: latestRevisions.id,
      requestBody: { pinned: true },
    });
    console.log({ updatedRevision });

    const getLatestRevisionBinaryData = await getRevisionFile(
      access_token,
      latestRevisions.exportLinks[BINARY_MIME_TYPE],
    );
    console.log({ getLatestRevisionBinaryData });
    const latestRevisionSheetData =
      sheetBinaryToArrayOfArrays(
        getLatestRevisionBinaryData,
        sheetId as string,
        undefined,
      ) || [];
    console.log({ latestRevisionSheetData });

    // check if event is ROW_ADDED.
    const dataStartIndex = 1;
    const keyRow = 1;
    const event = 'anyUpdate';
    const includeInOutput = 'new'; // TODO: check includeInOutput.
    if (isRowAdded) {
      await this.updateTriggerRevision(rowAddedTrigger, {
        appConfig: {
          googlesheet: {
            ...rowAddedTrigger.appConfig.googlesheet,
            lastRevisionId: latestRevisions.id,
            lastRevisionLink: latestRevisions.exportLinks[BINARY_MIME_TYPE],
          },
        },
      });
      const returnData = compareRevisions(
        previousRevisionSheetData,
        latestRevisionSheetData,
        keyRow,
        includeInOutput,
        [],
        dataStartIndex,
        event,
      );
      console.log({ returnData });
      // fire the rowAdded eventSource action.
    }
  }

  public async createTrigger(triggerDto: any, jwtClient: any) {
    const {
      userId,
      eventSource,
      documentId,
      sheetId,
      lastRevisionId,
      lastRevisionLink,
      dataRange,
      title
    } = triggerDto;

    const newTrigger = new Triggers();
    newTrigger.userId = userId;
    newTrigger.App = 'googlesheet';
    newTrigger.eventSource = eventSource;
    newTrigger.appConfig = {
      googlesheet: {
        documentId: documentId,
        sheetId: sheetId,
        lastRevisionId: lastRevisionId ?? 0,
        lastRevisionLink: lastRevisionLink,
        dataRange: dataRange,
      },
    };

    //TODO:
    // make call to script api to add the event hook with the sheet, for now using the createSheet which automatically add the event hook
    // const title = "Trigger Script"
    await this.callAppsScript(title, documentId, jwtClient, sheetId, userId);
    const response = await this.triggerRepository.save(newTrigger);
    console.log('new trigger registered successfully: %j', response);
    return response;
  }

  public async updateTriggerRevision(trigger: Triggers, updatedData: any) {
    console.log('updating trigger revision');
    const updatedTrigger = await this.triggerRepository.save({
      ...trigger,
      ...updatedData,
    });

    console.log({ updatedTrigger });
  }
  public async getTrigger(userId: string) {
    const existingTriggers = await this.triggerRepository.find({
      where: { userId: userId, App: TRIGGER_APP_NAME.GOOGLESHEET },
    });
    // console.log({ existingTriggers });
    return existingTriggers;
  }
}
