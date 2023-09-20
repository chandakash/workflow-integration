export interface GoogleServiceAccount {
    type: string,
    project_id: string,
    private_key_id: string,
    private_key: string,
    client_email: string,
    client_id: string,
    auth_uri: string,
    token_uri: string,
    auth_provider_x509_cert_url: string,
    client_x509_cert_url: string
}

export interface writeRangeDto {
  spreadsheetId: string;
  range: string;
  values: any[][];
}


export interface AppConfig {
  googlesheet?: {
    documentId: string;
    sheetId: string;
    lastRevisionId: number;
	lastRevisionLink: string;
    dataRange?: string;
  }
}








export type GenericValue = string | object | number | boolean | undefined | null;

export interface IDataObject {
	[key: string]: GenericValue | IDataObject | GenericValue[] | IDataObject[];
}



/**
 * GOOGLE SHEET INTERFACES.
 */


export const ROW_NUMBER = 'row_number';

export interface ISheetOptions {
	scope: string[];
}

export interface IGoogleAuthCredentials {
	email: string;
	privateKey: string;
}

export interface ISheetUpdateData {
	range: string;
	values: string[][];
}

export interface ILookupValues {
	lookupColumn: string;
	lookupValue: string;
}

export interface IToDeleteRange {
	amount: number;
	startIndex: number;
	sheetId: number;
}

export interface IToDelete {
	[key: string]: IToDeleteRange[] | undefined;
	columns?: IToDeleteRange[];
	rows?: IToDeleteRange[];
}

export type ValueInputOption = 'RAW' | 'USER_ENTERED';

export type ValueRenderOption = 'FORMATTED_VALUE' | 'FORMULA' | 'UNFORMATTED_VALUE';

export type RangeDetectionOptions = {
	rangeDefinition: 'detectAutomatically' | 'specifyRange' | 'specifyRangeA1';
	readRowsUntil?: 'firstEmptyRow' | 'lastRowInSheet';
	headerRow?: string;
	firstDataRow?: string;
	range?: string;
};

export type SheetDataRow = Array<string | number>;
export type SheetRangeData = SheetDataRow[];

// delete is del
type GoogleSheetsMap = {
	spreadsheet: 'create' | 'deleteSpreadsheet';
	sheet: 'append' | 'clear' | 'create' | 'delete' | 'read' | 'remove' | 'update' | 'appendOrUpdate';
};

// export type GoogleSheets = AllEntities<GoogleSheetsMap>;

// export type GoogleSheetsSpreadSheet = Entity<GoogleSheetsMap, 'spreadsheet'>;
// export type GoogleSheetsSheet = Entity<GoogleSheetsMap, 'sheet'>;

// export type SpreadSheetProperties = PropertiesOf<GoogleSheetsSpreadSheet>;
// export type SheetProperties = PropertiesOf<GoogleSheetsSheet>;

export type ResourceLocator = 'id' | 'url' | 'list';

export const ResourceLocatorUiNames = {
	id: 'By ID',
	url: 'By URL',
	list: 'From List',
};

export type SheetCellDecoded = {
	cell?: string;
	column?: string;
	row?: number;
};

export type SheetRangeDecoded = {
	nameWithRange: string;
	name: string;
	range: string;
	start?: SheetCellDecoded;
	end?: SheetCellDecoded;
};
