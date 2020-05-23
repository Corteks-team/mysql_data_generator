import { TableWithForeignKeys } from '../analyser';
import { MariaDBConnector } from './mariadb-connector';
import { MySQLColumn } from './mysql-column';
import { Table } from '../table';

export interface ForeignKey {
    column: string,
    foreignTable: string,
    foreignColumn: string;
    unique: boolean;
}

export interface DatabaseConnector {
    getTablesInformation(ignoredTables: string[]): Promise<TableWithForeignKeys[]>;
    getColumnsInformation(table: Table): Promise<MySQLColumn[]>;
    getForeignKeys(table: Table): Promise<ForeignKey[]>;
    destroy(): Promise<void>;
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

    build(): DatabaseConnector {
        switch (this.engine) {
            case databaseEngine.MariaDB:
                return new MariaDBConnector(
                    this.ip,
                    this.port,
                    this.database,
                    this.user,
                    this.password
                );
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