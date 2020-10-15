import Knex from 'knex';
import { getLogger } from 'log4js';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Table, Column, Schema } from '../schema.class';
import { DatabaseConnector } from './database-connector-builder';

export class PGConnector implements DatabaseConnector {
    private dbConnection: Knex;
    private triggers: Trigger[] = [];
    private logger = getLogger();
    private triggerBackupFile: string = path.join('settings', 'triggers.json');
    private database: string;

    constructor(
        uri: string
    ) {
        this.dbConnection = Knex({
            client: 'pg',
            connection: uri,
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
        this.database = this.dbConnection.client.config.connection.database;

        if (fs.existsSync(this.triggerBackupFile)) {
            this.triggers = fs.readJSONSync(this.triggerBackupFile);
        }
    }

    public async init(): Promise<void> {
        // await this.dbConnection.raw('SET GLOBAL foreign_key_checks = OFF;');
    }

    async countLines(table: Table) {
        const query = this.dbConnection(table.name).withSchema(this.database).count();
        return (await query)[0]['count'] as number;
    }

    async emptyTable(table: Table) {
        await this.dbConnection.raw(`DELETE FROM ${this.database}.${table.name}`);
        // await this.dbConnection.raw(`ALTER SEQUENCE ${table.name}_${table.columns[0].name}_seq RESTART WITH 1;`);
    }

    async executeRawQuery(query: string) {
        await this.dbConnection.raw(query);
    }

    async insert(table: string, rows: any[]): Promise<number> {
        if (rows.length === 0) return 0;
        const query = await this.dbConnection(table)
            .withSchema(this.database)
            .insert(rows)
            .toQuery()
            .concat(' ON CONFLICT DO NOTHING');
        const insertResult = await this.dbConnection.raw(query);
        console.log(insertResult);
        return insertResult.rowCount;
    }

    async destroy() {
        await this.dbConnection.destroy();
    }

    async getSchema(): Promise<Schema> {
        let tables = await this.getTablesInformation();
        tables = await Promise.all(tables.map(async (table) => {
            console.log(table);
            await this.extractColumns(table);
            console.log(table);
            await this.extractForeignKeys(table);
            console.log(table);
            return table;
        }));
        return Schema.fromJSON({ tables: tables });
    }

    private async extractColumns(table: Table) {
        this.logger.info(table.name);
        const columns: PGColumn[] = await this.getColumnsInformation(table);
        /*columns
            .filter((column: PGColumn) => {
                return ['enum', 'set'].includes(column.data_type || '');
            }).forEach((column: PGColumn) => {
                column.numeric_precision = column.column_type.match(/[enum,set]\((.*)\)$/)![1].split('\',\'').length;
            });*/

        table.columns = columns.map((pgColumn: PGColumn) => {
            console.log(pgColumn);
            const column = new Column();
            column.name = pgColumn.column_name;
            column.generator = pgColumn.data_type.replace(/"/g, '');
            // if (pgColumn.column_key && pgColumn.column_key.match(/PRI|UNI/ig)) column.unique = true;
            if (pgColumn.is_nullable === 'YES') column.nullable = true;
            column.max = pgColumn.character_maximum_length || pgColumn.numeric_precision || 255;
            // if (pgColumn.column_type && pgColumn.column_type.includes('unsigned')) column.unsigned = true;
            if (pgColumn.is_identity || pgColumn.is_generated !== 'NEVER') column.autoIncrement = true;
            switch (pgColumn.data_type) {
                case 'bit':
                case 'bit varying':
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
                case 'integer':
                case 'bigint':
                case 'money':
                case 'interval':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 2147483647;
                    } else {
                        column.min = -2147483648;
                        column.max = 2147483647;
                    }
                    break;
                case 'decimal':
                case 'numeric':
                case 'real':
                case 'double precision':
                    if (column.unsigned) {
                        column.min = 0;
                        column.max = 2147483647;
                    } else {
                        column.min = -2147483648;
                        column.max = 2147483647;
                    }
                    break;
                case 'smallserial':
                case 'bigserial':
                    column.min = 1;
                    column.max = 2147483647;
                    break;
                case 'serial':
                    column.min = 1;
                    column.max = 32767;
                case 'timestamp with time zone':
                case 'timestamp without time zone':
                case 'date':
                    column.minDate = '01-01-1970';
                    column.maxDate = undefined;
                    break;
                case 'time with time zone':
                case 'time without time zone':
                    break;
                case 'year':
                    column.min = 1901;
                    column.max = 2155;
                    break;
                case 'character varying':
                case 'varchar':
                case 'character':
                case 'char':
                case 'text':
                case 'bytea':
                    break;
                case 'set':
                case 'enum':
                    column.max = pgColumn.numeric_precision;
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
            console.log(column);
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
            .from('information_schema.triggers')
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
            .select('tablename AS name')
            .from('pg_tables')
            .where('schemaname', this.database);

        const tables = tableNames.map((row) => {
            const table = new Table();
            table.name = row.name;
            return table;
        });
        return tables;
    }

    async getColumnsInformation(table: Table) {
        return await this.dbConnection
            .select()
            .from('information_schema.columns')
            .where({
                'table_schema': this.database,
                'table_name': table.name
            });
    }

    async getForeignKeys(table: Table) {
        const foreignKeys = await this.dbConnection
            .select([
                'kcu.column_name AS column',
                'ccu.table_name AS foreignTable',
                'ccu.column_name AS foreignColumn'
            ])
            .from('information_schema.table_constraints AS tc')
            .innerJoin('information_schema.key_column_usage AS kcu', function () {
                this.on('tc.constraint_name', '=', 'kcu.constraint_name')
                    .andOn('tc.table_schema', '=', 'kcu.table_schema');
            })
            .innerJoin('information_schema.constraint_column_usage AS ccu', function () {
                this.on('tc.constraint_name', '=', 'ccu.constraint_name')
                    .andOn('tc.table_schema', '=', 'ccu.table_schema');
            })
            .where('tc.constraint_type', 'FOREIGN KEY')
            .andWhere('tc.table_name', table.name);

        console.log(foreignKeys);

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
            .withSchema(this.database)
            .distinct(`${foreignTable}.${foreignColumn}`)
            .orderByRaw('random()')
            .limit(limit);
        if (condition) {
            query.andWhere(this.dbConnection.raw(condition));
        }
        if (unique) {
            query.leftJoin(table, function () {
                this.on(`${table}.${column}`, `${foreignTable}.${foreignColumn}`);
            }).whereNull(`${table}.${column}`);
        }
        console.log(query.toString());
        values = (await query).map(result => result[foreignColumn]);
        return values;
    }
}