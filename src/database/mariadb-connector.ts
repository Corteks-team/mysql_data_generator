import Knex from 'knex';
import { getLogger } from 'log4js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Table, Column, Schema } from '../schema/schema.class';
import { DatabaseConnector } from './database-connector-builder';

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
        await this.dbConnection.raw('SET GLOBAL autocommit = OFF;');
        await this.dbConnection.raw('SET GLOBAL unique_checks = OFF;');
        this.logger.warn(`For performance foreign_key_checks, autocommit and unique_checks are disabled during insert.`);
        this.logger.warn(`They should be set back on at the end. But in case of crash you should set them back manually by using:`);
        this.logger.warn(`SET GLOBAL foreign_key_checks = ON;`);
        this.logger.warn(`SET GLOBAL autocommit = ON;`);
        this.logger.warn(`SET GLOBAL unique_checks = ON;`);
    }

    async countLines(table: Table) {
        return (await this.dbConnection(table.name).count())[0]['count(*)'] as number;
    }

    async emptyTable(table: Table) {
        await this.dbConnection.raw(`DELETE FROM ${table.name}`);
        await this.dbConnection.raw(`ALTER TABLE ${table.name} AUTO_INCREMENT = 1;`);
    }

    async executeRawQuery(query: string) {
        await this.dbConnection.raw(query);
    }

    async insert(table: string, rows: any[]): Promise<number> {
        if (rows.length === 0) return 0;
        const query = await this.dbConnection(table)
            .insert(rows)
            .toQuery()
            .replace('insert into', 'insert ignore into');
        const insertResult = await this.dbConnection.raw(query);
        return insertResult[0].affectedRows;
    }

    async destroy() {
        await this.dbConnection.raw('SET GLOBAL foreign_key_checks = ON;');
        await this.dbConnection.raw('SET GLOBAL autocommit = ON;');
        await this.dbConnection.raw('SET GLOBAL unique_checks = ON;');
        await this.dbConnection.destroy();
    }

    async getSchema(): Promise<Schema> {
        let tables = await this.getTablesInformation();
        tables = await Promise.all(tables.map(async (table) => {
            await this.extractColumns(table);
            await this.extractForeignKeys(table);
            return table;
        }));
        return Schema.fromJSON({ tables: tables });
    }

    private async extractColumns(table: Table) {
        this.logger.info(table.name);
        const columns: MySQLColumn[] = await this.getColumnsInformation(table);
        columns
            .filter((column: MySQLColumn) => {
                return ['enum', 'set'].includes(column.DATA_TYPE || '');
            }).forEach((column: MySQLColumn) => {
                column.NUMERIC_PRECISION = column.COLUMN_TYPE.match(/[enum,set]\((.*)\)$/)![1].split('\',\'').length;
            });

        table.columns = columns.map((mysqlColumn: MySQLColumn) => {
            const column = new Column();
            column.name = mysqlColumn.COLUMN_NAME;
            column.generator = mysqlColumn.DATA_TYPE;
            if (mysqlColumn.COLUMN_KEY && mysqlColumn.COLUMN_KEY.match(/PRI|UNI/ig)) column.unique = true;
            if (mysqlColumn.IS_NULLABLE === 'YES') column.nullable = true;
            column.max = mysqlColumn.CHARACTER_MAXIMUM_LENGTH || mysqlColumn.NUMERIC_PRECISION || 255;
            if (mysqlColumn.COLUMN_TYPE && mysqlColumn.COLUMN_TYPE.includes('unsigned')) column.unsigned = true;
            if (mysqlColumn.EXTRA && mysqlColumn.EXTRA.includes('auto_increment')) column.autoIncrement = true;
            switch (mysqlColumn.DATA_TYPE) {
                case 'bit':
                    break;
                case 'bool':
                case 'boolean':
                    break;
                case 'smallint':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 65535;
                    } else {
                        column.min = -32768;
                        column.max = 32767;
                    }
                    break;
                case 'mediumint':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 16777215;
                    } else {
                        column.min = -8388608;
                        column.max = 8388607;
                    }
                    break;
                case 'tinyint':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 255;
                    } else {
                        column.min = -128;
                        column.max = 127;
                    }
                    break;
                case 'int':
                case 'integer':
                case 'bigint':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 2147483647;
                    } else {
                        column.min = -2147483648;
                        column.max = 2147483647;
                    }
                    break;
                case 'decimal':
                case 'dec':
                case 'float':
                case 'double':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 2147483647;
                    } else {
                        column.min = -2147483648;
                        column.max = 2147483647;
                    }
                    break;
                case 'date':
                case 'datetime':
                case 'timestamp':
                    column.minDate = '01-01-1970';
                    column.maxDate = undefined;
                    break;
                case 'time':
                    break;
                case 'year':
                    column.min = 1901;
                    column.max = 2155;
                    break;
                case 'varchar':
                case 'char':
                case 'binary':
                case 'varbinary':
                case 'tinyblob':
                case 'text':
                case 'mediumtext':
                case 'longtext':
                case 'blob':
                case 'mediumblob': // 16777215
                case 'longblob': // 4,294,967,295
                    break;
                case 'set':
                case 'enum':
                    column.max = mysqlColumn.NUMERIC_PRECISION;
                    break;
            }
            return column;
        });
    }

    private extractForeignKeys = async (table: Table) => {
        const foreignKeys = await this.getForeignKeys(table);
        table.referencedTables = [];
        for (let c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            const match = foreignKeys.find((fk) => fk.column.toLowerCase() === column.name.toLowerCase());
            if (match) {
                column.foreignKey = { table: match.foreignTable, column: match.foreignColumn };
                column.unique = column.unique || match.uniqueIndex || false;
                table.referencedTables.push(column.foreignKey.table);
            }
        }
    };

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
        const tableNames = await this.dbConnection
            .select<{ name: string; }[]>([
                this.dbConnection.raw('t.TABLE_NAME AS name')
            ])
            .from('information_schema.tables as t')
            .where('t.TABLE_SCHEMA', this.database)
            .andWhere('t.TABLE_TYPE', 'BASE TABLE')
            .groupBy('t.TABLE_SCHEMA', 't.TABLE_NAME');

        const tables = tableNames.map((row) => {
            const table = new Table();
            table.name = row.name;
            return table;
        });
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
}