import { MariaDBConnector } from './mariadb-connector';
import { Table, Schema, ForeignKey } from '../schema/schema.class';
import { DatabaseEngines } from './database-engines';

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
    getValuesForForeignKeys(table: string, column: string, foreignTable: string, foreignColumn: string, limit: number, unique: boolean, condition: string | undefined): Promise<any[]>;
    backupTriggers(tables: string[]): Promise<void>;
    cleanBackupTriggers(): void;
    disableTriggers(table: string): Promise<void>;
    enableTriggers(table: string): Promise<void>;
}

export class DatabaseConnectorBuilder {
    private ip: string = '127.0.0.1';
    private port: number = 3306;
    private database: string = '';
    private user: string = '';
    private password: string = '';

    constructor(
        private engine: DatabaseEngines,
    ) { }

    public async build(): Promise<DatabaseConnector> {
        switch (this.engine) {
            case DatabaseEngines.MARIADB:
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