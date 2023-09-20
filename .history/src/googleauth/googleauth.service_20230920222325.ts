import { Injectable, Scope } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { JWT, OAuth2Client } from "google-auth-library";
import { google } from 'googleapis';
import { GoogleServiceAccount } from "src/common/interfaces";
import { Token } from "src/token/entities/token.entity";
import { Triggers } from "src/triggers/entities/triggers.entity";
import { Repository } from "typeorm";
import * as util from 'util';

@Injectable()
export class GoogleauthService {
    private readonly SCOPE_SPREADSHEETS: string;
    private readonly SCOPE_DRIVE: string;
    private readonly SCOPE_SCRIPT_PROJECT: string;
    private readonly SCOPE_SCRIPT_DEPLOYMENT: string;
    private readonly SCOPE_SCRIPT_APP: string;
    private readonly SCOPE_WEBAPP_DEPLOY: string;
    private readonly SCOPE_DRIVE_SCRIPT: string;
    private readonly SCOPE_SCRIPT_EXTERNAL_REQUEST: string;
    
    constructor(@InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    ) {
        this.SCOPE_SPREADSHEETS = 'https://www.googleapis.com/auth/spreadsheets';
        this.SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive';
        this.SCOPE_SCRIPT_PROJECT = 'https://www.googleapis.com/auth/script.projects';
        this.SCOPE_SCRIPT_DEPLOYMENT = "https://www.googleapis.com/auth/script.deployments"
        this.SCOPE_SCRIPT_APP = "https://www.googleapis.com/auth/script.scriptapp";
        this.SCOPE_WEBAPP_DEPLOY = "https://www.googleapis.com/auth/script.webapp.deploy",
        this.SCOPE_DRIVE_SCRIPT = "https://www.googleapis.com/auth/drive.scripts",
        this.SCOPE_SCRIPT_EXTERNAL_REQUEST = "https://www.googleapis.com/auth/script.external_request"
    }

    async storeAuthCode(userId: string, authCode: string) {
        //TODO: token already case.
        const oauthClient = this.getClient(userId);
        const { tokens } = await oauthClient.getToken(authCode);

        const newToken = new Token();
        newToken.userId = userId;
        newToken.authCode = authCode;
        newToken.tokens = tokens;
        const createdToken = await this.tokenRepository.save(newToken);
        console.log("New token created:", createdToken);
    }

    async getAuthCode(userId: string) {
        const existingToken = await this.tokenRepository.findOne({
            where: { userId },
          });
          console.log({existingToken});
        return existingToken.authCode;
    }

    async updateClientToken(userId: string, oauthClient: OAuth2Client) {
        // Update your JWT client here using the new token
        //TODO: first check the presence of the tokens in db.
        let tokenObj = await this.tokenRepository.findOne({where: { userId }});
        console.log({tokenObj});
        if (tokenObj) {
            const tokens = tokenObj.tokens;
            oauthClient.setCredentials(tokens)
            const currentTime = Date.now();
            if(tokens){
                if (tokens.expiry_date && tokens.expiry_date < currentTime) {
                    console.log('updating access token using refresh token');
                    const refreshResponse = await oauthClient.refreshAccessToken();
                    console.log({refreshResponse});
                    const newTokens = refreshResponse.credentials;
                    console.log({newTokens});
                    tokenObj.tokens = newTokens;
                    // updating new creds.
                    oauthClient.setCredentials(tokens);
                    tokenObj = await this.tokenRepository.save(tokenObj);
                    console.log("Token updated:", tokenObj);
                }
            }
          } else {
            console.error('tokens are not present in db, authenticate the request using authUrl');
          }
        return oauthClient
    }

    /**
     * Get the Google OAuth2 client
     *
     */
    public getClient(userId: string): any {
        console.log('client user id : '+userId);
        const oAuthClient = new google.auth.OAuth2(
            {
                // keyFile: '../../serviceAccountKey.json',
                // email: process.env.GOOGLE_CLIENT_EMAIL as string,
                // key: process.env.GOOGLE_PRIVATE_KEY as string,
                clientId: "745247720301-rjngrcecudiiunb6ropm1f8i57mcp7oc.apps.googleusercontent.com",
                clientSecret: "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",
                redirectUri: `http://localhost:3001/auth/google/callback`
            }
        );

        const url = oAuthClient.generateAuthUrl({
            access_type: 'offline',
            response_type: "code",
            prompt: "consent",
            scope: [this.SCOPE_DRIVE, this.SCOPE_SPREADSHEETS, this.SCOPE_SCRIPT_PROJECT, this.SCOPE_SCRIPT_APP, this.SCOPE_SCRIPT_DEPLOYMENT, this.SCOPE_WEBAPP_DEPLOY, this.SCOPE_DRIVE_SCRIPT, this.SCOPE_SCRIPT_EXTERNAL_REQUEST].join(" "),
            redirect_uri: `http://localhost:3001/auth/google/callback`,
            state: JSON.stringify({ userId: userId })
        });
        console.info(`authenticate using authUrl: ${url}`);
        return oAuthClient;

                
    }

    public getJWTClient(): any{
        return new google.auth.JWT({
            email: 'sheet-integration@integrations-394117.iam.gserviceaccount.com',
            key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEP1yVtFDM8dae\nOFqoKL+u1SP7b48WoU/3af27VwDohuHhT8FHMr9zTyz7VaUPYKBlku91EhpKOfP6\nMDUioeAxlVAg90qDs8NSYRgnSuRypNYSLfT8UelsxvxRuykThLN7Iba4dhAEGuwm\nSsOIap03QBntBJZdL33BWFPIE2/Mki7it9i7trzr3QkaZP1D6spu/wAoQ5cg6x1x\nL13xqwAJI6xlXiqu74O7xoKmu3rRoILKl8DruO/EPZ3bGkXzSythJxHjPxZuDD+r\n25uohFM4fkLaEAboW4u3tcLGOaIDAN7w2s3zCI0HqxjdCMmWuXuMSIR/gF9kU/OO\nHZBz1K7zAgMBAAECggEAGB/z6UFj53XZXNTvrBlqSvtPs5Kow+7rri4c74FIDs26\nCeEskOyXpXy3umPyaRwHS8VO45Ton3RVXk270niU33OMCKltwxf/rGpcNkRaJg/G\nczCsG7KUH/esP/3ilFAtYjcoR6/X0zFeE20AcY4tqoOaTE1SkL0MWA7cKc3d4gdk\n93NqfFf9pkP+jkXSsOnL1YsQkN35uaumEeln2box+FPDc0aVuEVJIr8x/D+9Mutk\nO8pXnOAh18flLrTPvfEWhtrZ0tUtChe9fXbRS9d/5CyH4duzj4L2EsrNsmm275nB\nPfqAJWzylDOeIyJNsC/P4CeCWGSqTs9H88vRULjKiQKBgQD8JiKIy8H/DCrxj9zb\nYyvbtsfxjsTb45dWGIx9NnVbgKNPqoOJDe7lSkiK08h7t8bktAok7+oENK4wPxyw\nidR+SEuIrfiOkPyTrj4tDoIYTBnQzTuV4hfvy7vnWH6Jpy4gLiM/WWIOqDHhgjav\nc9l/aE8c3lyf6JDl7LvesY1QqQKBgQDHPqkMAj5drlPmHyJXJGV+BEXsrmr+7sxD\nmk0fg/99p7KXMhtPipGVBVVV6c36xkLy4B6CUWNWRBXvdQCKWJSL1HLYe3vSiyKH\nLBO1WEmTKKAeRv4N4LyHQnUJGWKnEZbijGOR+INt3Fx25d9fwcC7TbMBiaAYaIDK\n9nfSkOFYOwKBgQCxXdHlEA9CbTi3+06MNFJhl01GKftoAcwuj84jNe+PkglOvM8R\n1W86cupcXWUlQbzym4KXQPwIQVZWMc7oj8udmRUo69dv0aUZ7PNnllEE7mMqcXN8\nlzHnSBTBQ4qfIa5cjJfWs/U6Ai40RvhYqtFPwfwEfpYBFgL2+XOdzp9tIQKBgBD2\nEZf3HO4GqBe/8MFwVL98h6NVWcBn/bWHjicvqnE89GQQnOiRiEEiWhhdNe6yMALS\n92XqncU7OI7Q7AHa9pJMvJYXNPxAYekV5Hucj27al37cVkZCKmptSt9CbPaB9dFF\nWDiV6kJQ7wIkIXbaXJjVTXbFC37oboZYouym7rf/AoGAe+0TRYyGT9pvR9odzrtj\nF6FPbLrCMAObtTDYKAVl+0BdB/woti6fxqXgxnIjYOR3Nw8owHHcSXojkab+VCkF\nFguopbWP48pN/zIN+hngsNDFe8jbMcpyAq0Ae+mR4+8p6BX81MyRyu5ZB0M3LBRJ\nEmqrpBh6l3jRRHKmq2XMrPE=\n-----END PRIVATE KEY-----\n',
            scopes: [this.SCOPE_DRIVE, this.SCOPE_SPREADSHEETS, this.SCOPE_SCRIPT_PROJECT, this.SCOPE_SCRIPT_APP, this.SCOPE_SCRIPT_DEPLOYMENT, this.SCOPE_WEBAPP_DEPLOY, this.SCOPE_DRIVE_SCRIPT, this.SCOPE_SCRIPT_EXTERNAL_REQUEST].join(" ")
        })
    }
}
