import { TableWithForeignKeys } from '../analyser';
import { DatabaseConnector } from './database-connector-builder';
import Knex from 'knex';
import { Table } from '../table';

export class MariaDBConnector implements DatabaseConnector {
    private dbConnection: Knex;

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
        }).on('query-error', (err) => {
            console.error(err.code, err.name);
        });
    }

    async getTablesInformation(ignoredTables: string[], tablesToFill: string[]): Promise<TableWithForeignKeys[]> {
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

        if (ignoredTables.length > 0) tablesQuery.whereNotIn('t.TABLE_NAME', ignoredTables);
        if (tablesToFill.length > 0) tablesQuery.whereIn('t.TABLE_NAME', tablesToFill);

        const tables = await tablesQuery;

        for (const t in tables) {
            const table = tables[t];
            table.referencedTables = (table.referencedTablesString || '').split(',');
            table.maxLines = await this.countLines(table);
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
        await this.dbConnection.destroy();
    }
}