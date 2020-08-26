import { DatabaseConnector } from '../src/database/database-connector-builder';
import { Table } from '../src/table-descriptor.interface';
import { MySQLColumn } from '../src/database/mysql-column';


export class TestConnector implements DatabaseConnector {
    init=jest.fn();
    backupTriggers= jest.fn();
    cleanBackupTriggers=jest.fn();
    disableTriggers=jest.fn();
    enableTriggers=jest.fn();
    countLines = jest.fn(async () => 0);
    destroy = jest.fn();
    emptyTable = jest.fn();
    executeRawQuery = jest.fn();
    getColumnsInformation = jest.fn(async (table: Table): Promise<MySQLColumn[]> => []);
    getForeignKeys = jest.fn(async () => []);
    getTablesInformation = jest.fn();
    getValuesForForeignKeys = jest.fn();
    insert = jest.fn(async (tableName: string, rows: any[]) => rows.length);
}