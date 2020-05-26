import { DatabaseConnector } from '../src/database/database-connector-builder';

export class TestConnector implements DatabaseConnector {
    countLines = jest.fn();
    destroy = jest.fn();
    emptyTable = jest.fn();
    executeRawQuery = jest.fn();
    getColumnsInformation = jest.fn();
    getForeignKeys = jest.fn();
    getTablesInformation = jest.fn();
    getValuesForForeignKeys = jest.fn();
    insert = jest.fn();
}