import Knex from 'knex';
import { getLogger } from 'log4js';
import * as fs from 'fs-extra';
import * as path from 'path';

export class MariaDBConnector implements DatabaseConnector {
    private dbConnection: Knex;
    private triggers: Trigger[] = [];
    private logger = getLogger();
    private triggerBackupFile: string = path.join('settings', 'triggers.json');

    constructor(
        ip: string,
        port: number,
        private database: string,
        user: string,
        password: string
    ) {
        this.dbConnection = Knex({
            client: 'mysql',
            connection: {
                database: database,
                host: ip,
                port: port,
                user: user,
                password: password,
                supportBigNumbers: true,
            },
            log: {
                warn: (message) => {
                    this.logger.warn(message);
                },
                error: (message) => {
                    this.logger.error(message);
                },
                deprecate: (message) => {
                    this.logger.warn(message);
                },
                debug: (message) => {
                    this.logger.debug(message);
                }
            }
        }).on('query-error', (err) => {
            this.logger.error(err.code, err.name);
        });

        if (fs.existsSync(this.triggerBackupFile)) {
            this.triggers = fs.readJSONSync(this.triggerBackupFile);
        }
    }

    public async init(): Promise<void> {
        await this.dbConnection.raw('SET GLOBAL foreign_key_checks = OFF;');
    }

    public async backupTriggers(tables: string[]): Promise<void> {
        const triggers = await this.dbConnection
            .select()
            .from('information_schema.TRIGGERS')
            .where('event_object_schema', this.database)
            .whereIn(`event_object_table`, tables);
        this.triggers = this.triggers.concat(triggers);
        fs.writeJSONSync(this.triggerBackupFile, this.triggers);
    }

    public cleanBackupTriggers(): void {
        fs.unlinkSync(this.triggerBackupFile);
    }

    public async disableTriggers(table: string): Promise<void> {
        const triggers = this.triggers.filter((trigger) => {
            return trigger.EVENT_OBJECT_SCHEMA === this.database && trigger.EVENT_OBJECT_TABLE === table;
        });
        const promises = triggers.map((trigger) => {
            return this.dbConnection.raw(`DROP TRIGGER IF EXISTS ${trigger.TRIGGER_SCHEMA}.${trigger.TRIGGER_NAME};`);
        });
        await Promise.all(promises)
            .catch(err => console.warn(err.message));
    }

    public async enableTriggers(table: string): Promise<void> {
        for (let i = 0; i < this.triggers.length; i++) {
            const trigger = this.triggers[i];
            if (trigger.EVENT_OBJECT_SCHEMA !== this.database || trigger.EVENT_OBJECT_TABLE !== table) continue;
            await this.dbConnection.raw(`DROP TRIGGER IF EXISTS ${trigger.TRIGGER_SCHEMA}.${trigger.TRIGGER_NAME};`);
            await this.dbConnection.raw(
                `CREATE DEFINER = ${trigger.DEFINER} 
                TRIGGER ${trigger.TRIGGER_SCHEMA}.${trigger.TRIGGER_NAME} ${trigger.ACTION_TIMING} ${trigger.EVENT_MANIPULATION} 
                ON ${trigger.EVENT_OBJECT_SCHEMA}.${trigger.EVENT_OBJECT_TABLE}
                FOR EACH ROW
                ${trigger.ACTION_STATEMENT}`
            );
            this.triggers.splice(i, 1);
        }
    }

    async getTablesInformation(): Promise<Table[]> {
        const tablesQuery = this.dbConnection
            .select([
                this.dbConnection.raw('t.TABLE_NAME AS name'),
                this.dbConnection.raw('GROUP_CONCAT(c.REFERENCED_TABLE_NAME SEPARATOR ",") AS referencedTablesString'),
            ])
            .from('information_schema.tables as t')
            .leftJoin('information_schema.key_column_usage as c', function () {
                this.on('c.CONSTRAINT_SCHEMA', '=', 't.TABLE_SCHEMA')
                    .andOn('c.TABLE_NAME', '=', 't.TABLE_NAME');
            })
            .where('t.TABLE_SCHEMA', this.database)
            .andWhere('t.TABLE_TYPE', 'BASE TABLE')
            .groupBy('t.TABLE_SCHEMA', 't.TABLE_NAME')
            .orderBy(2);

        const tables = await tablesQuery;

        for (const t in tables) {
            const table = tables[t];
            table.referencedTables = (table.referencedTablesString as string || '').split(',').filter(x => x.length > 0);
            delete (table.referencedTablesString)
        }
        return tables;
    }

    async getColumnsInformation(table: Table) {
        return await this.dbConnection.select()
            .from('information_schema.COLUMNS')
            .where({
                'TABLE_SCHEMA': this.database,
                'TABLE_NAME': table.name
            });
    }

    async getForeignKeys(table: Table) {
        const subQuery = this.dbConnection
            .select([
                'kcu2.table_name',
                'kcu2.column_name',
                'kcu2.constraint_schema',
                this.dbConnection.raw('1 AS unique_index')
            ])
            .from('information_schema.KEY_COLUMN_USAGE AS kcu2')
            .innerJoin('information_schema.TABLE_CONSTRAINTS AS tc', function () {
                this.on('tc.CONSTRAINT_SCHEMA', '=', 'kcu2.CONSTRAINT_SCHEMA')
                    .andOn('tc.TABLE_NAME', '=', 'kcu2.TABLE_NAME')
                    .andOn('tc.CONSTRAINT_NAME', '=', 'kcu2.CONSTRAINT_NAME')
                    .andOnIn('tc.CONSTRAINT_TYPE', ["PRIMARY KEY", "UNIQUE"]);
            })
            .groupBy(['kcu2.TABLE_NAME', 'kcu2.CONSTRAINT_NAME'])
            .having(this.dbConnection.raw('count(kcu2.CONSTRAINT_NAME) < 2'))
            .as('indexes');


        const foreignKeys = await this.dbConnection.select([
            'kcu.column_name AS column',
            'kcu.referenced_table_name AS foreignTable',
            'kcu.referenced_column_name AS foreignColumn',
            'unique_index AS uniqueIndex'
        ])
            .from('information_schema.key_column_usage as kcu')
            .leftJoin(subQuery, function () {
                this.on('kcu.table_name', 'indexes.table_name')
                    .andOn('kcu.column_name', 'indexes.column_name')
                    .andOn('kcu.constraint_schema', 'indexes.constraint_schema');
            })
            .where('kcu.table_name', table.name)
            .whereNotNull('kcu.referenced_column_name');

        return foreignKeys;
    }

    async countLines(table: Table) {
        return (await this.dbConnection(table.name).count())[0]['count(*)'] as number;
    }

    async emptyTable(table: Table) {
        await this.dbConnection.raw('SET FOREIGN_KEY_CHECKS = 0;');
        await this.dbConnection.raw(`DELETE FROM ${table.name}`);
        await this.dbConnection.raw(`ALTER TABLE ${table.name} AUTO_INCREMENT = 1;`);
    }

    async getValuesForForeignKeys(
        table: string,
        column: string,
        foreignTable: string,
        foreignColumn: string,
        limit: number,
        unique: boolean,
        condition: string,
    ) {
        let values = [];
        const query = this.dbConnection(foreignTable)
            .distinct(`${foreignTable}.${foreignColumn}`)
            .orderByRaw('RAND()')
            .limit(limit);
        if (condition) {
            query.andWhere(this.dbConnection.raw(condition));
        }
        if (unique) {
            query.leftJoin(table, function () {
                this.on(`${table}.${column}`, `${foreignTable}.${foreignColumn}`);
            }).whereNull(`${table}.${column}`);
        }
        values = (await query).map(result => result[foreignColumn]);
        return values;
    }

    async executeRawQuery(query: string) {
        await this.dbConnection.raw(query);
    }

    async insert(table: string, rows: any[]): Promise<number> {
        const query = await this.dbConnection(table)
            .insert(rows)
            .toQuery()
            .replace('insert into', 'insert ignore into');
        const insertResult = await this.dbConnection.raw(query);
        return insertResult[0].affectedRows;
    }

    async destroy() {
        await this.dbConnection.raw('SET GLOBAL foreign_key_checks = ON;');
        await this.dbConnection.destroy();
    }
}