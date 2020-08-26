import { MariaDBConnector } from './mariadb-connector';
import { MySQLColumn } from './mysql-column';
import { Table } from '../table-descriptor.interface';

export interface ForeignKey {
    column: string,
    foreignTable: string,
    foreignColumn: string;
    uniqueIndex: boolean;
}

export interface DatabaseConnector {
    init(): Promise<void>;
    getTablesInformation(ignoredTables: string[], tablesToFill: string[]): Promise<Table[]>;
    getColumnsInformation(table: Table): Promise<MySQLColumn[]>;
    getForeignKeys(table: Table): Promise<ForeignKey[]>;
    countLines(table: Table): Promise<number>;
    emptyTable(table: Table): Promise<void>;
    getValuesForForeignKeys(table: string, column: string, foreignTable: string, foreignColumn: string, limit: number, unique: boolean, condition: string | undefined): Promise<any[]>;
    executeRawQuery(query: string): Promise<void>;
    insert(table: string, lines: any[]): Promise<number>;
    destroy(): Promise<void>;
    backupTriggers(tables: string[]): Promise<void>;
    cleanBackupTriggers(): void;
    disableTriggers(table: string): Promise<void>;
    enableTriggers(table: string): Promise<void>;
}

export enum databaseEngine {
    'MariaDB'
}

export class DatabaseConnectorBuilder {
    private ip: string = '127.0.0.1';
    private port: number = 3306;
    private database: string = '';
    private user: string = '';
    private password: string = '';

    constructor(
        private engine: databaseEngine,
    ) { }

    public async build(): Promise<DatabaseConnector> {
        switch (this.engine) {
            case databaseEngine.MariaDB:
                const connector = new MariaDBConnector(
                    this.ip,
                    this.port,
                    this.database,
                    this.user,
                    this.password
                );
                await connector.init();
                return connector;
            default:
                throw new Error('Unsupported engine.');
        }
    }

    setHost(ip: string) {
        this.ip = ip;
        return this;
    }

    setPort(port: number) {
        this.port = port;
        return this;
    }

    setDatabase(database: string) {
        this.database = database;
        return this;
    }

    setCredentials(user: string, password: string) {
        this.user = user;
        this.password = password;
        return this;
    }
}