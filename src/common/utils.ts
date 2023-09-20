const request = require('request');
import { IDataObject } from './interfaces';
import * as https from 'https';
// const https = require("https");

export async function apiRequest(
  method: string,
  resource: string,
  body: IDataObject = {},
  qs: IDataObject = {},
  access_token: string,
  uri?: string,
  headers: IDataObject = {},
  option: IDataObject = {},
) {
  return new Promise((resolve, reject) => {
    const options: any = {
      headers: {
        'Content-Type': 'application/json',
      },
      method,
      body,
      qs,
      uri: uri,
      json: true,
      ...option,
    };
    // try {
    if (Object.keys(headers).length !== 0) {
      options.headers = Object.assign({}, options.headers, headers);
    }
    if (Object.keys(body).length === 0) {
      delete options.body;
    }
    request(options, (error: any, response: any, body: any) => {
		// console.log({response});
      if (error) {
		console.log({error});
        reject(error);
      } else if (response.statusCode === 200) {
        const binaryData = Buffer.from(body, 'binary');
        // console.log({ binaryData });
        resolve(binaryData); // Resolve the promise with the binary data
      } else {
        reject(`Request failed with status code ${response.statusCode}`);
      }
    });
    // } catch (error) {
    //   if (error.code === 'ERR_OSSL_PEM_NO_START_LINE') {
    //     error.statusCode = '401';
    //   }
    //   console.error(error);
    //   throw new Error(error);
    // }
  });
}
