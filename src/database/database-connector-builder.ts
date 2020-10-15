import { MariaDBConnector } from './mariadb-connector';
import { Table, Schema, ForeignKey } from '../schema/schema.class';
import { DatabaseEngines } from './database-engines';
import * as URI from 'uri-js';
import { PGConnector } from './postgres-connector';

export interface DatabaseConnector {
    init(): Promise<void>;
    destroy(): Promise<void>;
    countLines(table: Table): Promise<number>;
    emptyTable(table: Table): Promise<void>;
    executeRawQuery(query: string): Promise<void>;
    insert(table: string, lines: any[]): Promise<number>;
    getSchema(): Promise<Schema>;

    getTablesInformation(): Promise<Table[]>;
    getColumnsInformation(table: Table): Promise<MySQLColumn[]>;
    getForeignKeys(table: Table): Promise<ForeignKey[]>;
    getValuesForForeignKeys(
        table: string,
        column: string,
        foreignTable: string,
        foreignColumn: string,
        limit: number,
        unique: boolean,
        condition: string | undefined,
    ): Promise<any[]>;
    backupTriggers(tables: string[]): Promise<void>;
    cleanBackupTriggers(): void;
    disableTriggers(table: string): Promise<void>;
    enableTriggers(table: string): Promise<void>;
}

export class DatabaseConnectorBuilder {
    private uriComponents: URI.URIComponents;

    constructor(
        private uri: string,
    ) {
        this.uriComponents = URI.parse(this.uri);
    }

    public async build(): Promise<DatabaseConnector> {
        let connector: DatabaseConnector;
        switch (this.uriComponents.scheme) {
            case DatabaseEngines.MYSQL:
            case DatabaseEngines.MARIADB:
                connector = new MariaDBConnector(this.uri);
                await connector.init();
                break;
            case DatabaseEngines.POSTGRES:
                connector = new PGConnector(
                    this.uri,
                );
                break;
            default:
                throw new Error('Unsupported engine.');
        }
        return connector;
    }
}