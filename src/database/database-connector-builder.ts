import { MariaDBConnector } from './mariadb-connector';

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