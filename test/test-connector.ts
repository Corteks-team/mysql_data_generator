import { DatabaseConnector } from '../src/database/database-connector-builder';
import { TableWithForeignKeys } from '../src/analysis/analyser';


export class TestConnector implements DatabaseConnector {
    countLines = jest.fn(async () => 0);
    destroy = jest.fn();
    emptyTable = jest.fn();
    executeRawQuery = jest.fn();
    getColumnsInformation = jest.fn(async () => []);
    getForeignKeys = jest.fn();
    getTablesInformation = jest.fn(async (tablesToFill: string[], ignoredTables: string[]): Promise<TableWithForeignKeys[]> => []);
    getValuesForForeignKeys = jest.fn();
    insert = jest.fn(async (tableName: string, rows: any[]) => rows.length);
}