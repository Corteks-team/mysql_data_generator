import Knex = require('knex');
import { Column } from './column';
import { Schema } from './main';
import { MySQLColumn } from './mysql-column';
import { Table } from './table';


export interface CustomSchema {
    maxCharLength?: number;
    ignoredTables?: string[];
    tables?: Partial<Table>[];
    values?: { [key: string]: any[]; };
}

const DEFAULT_MAX_CHAR_LENGTH: number = 255;

const dummyCustomSchema: CustomSchema = {
    maxCharLength: DEFAULT_MAX_CHAR_LENGTH,
    ignoredTables: [],
    tables: [],
    values: {}
};

export class Analyser {
    private tables: Table[] = [];
    private values: { [key: string]: any[]; };

    constructor(
        private dbConnection: Knex,
        private database: string,
        private customSchema: CustomSchema = dummyCustomSchema,
    ) {
        this.values = customSchema.values || {};
    }

    public extractTables = async () => {
        const tables: { name: string, lines: number, referenced_table: any; }[] = await this.dbConnection
            .select([
                this.dbConnection.raw('t.TABLE_NAME AS name'),
                this.dbConnection.raw('GROUP_CONCAT(c.REFERENCED_TABLE_NAME SEPARATOR ",") AS referenced_table'),
            ])
            .from('information_schema.tables as t')
            .leftJoin('information_schema.key_column_usage as c', function () {
                this.on('c.CONSTRAINT_SCHEMA', '=', 't.TABLE_SCHEMA')
                    .andOn('c.TABLE_NAME', '=', 't.TABLE_NAME');
            })
            .where('t.TABLE_SCHEMA', this.database)
            .andWhere('t.TABLE_TYPE', 'BASE TABLE')
            .whereNotIn('t.TABLE_NAME', this.customSchema.ignoredTables || [])
            .groupBy('t.TABLE_SCHEMA', 't.TABLE_NAME')
            .orderBy(2);
        for (let t = 0; t < tables.length; t++) {
            const table = tables[t];
            let lines;
            if (this.customSchema.tables) {
                const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
                if (customTable) lines = customTable.lines;
                if (customTable && customTable.columns) {
                    for (const column of customTable.columns) {
                        if (column.foreignKey) {
                            if (table.referenced_table) table.referenced_table += `,${column.foreignKey.table}`;
                            else table.referenced_table = `${column.foreignKey.table}`;
                        }
                    }
                }
            }
            if (lines === undefined) lines = (await this.dbConnection(table.name).count())[0]['count(*)'] as number;
            table.lines = lines;
            if (table.referenced_table !== null) {
                table.referenced_table = table.referenced_table.split(',');
            } else {
                table.referenced_table = [];
            }
        }

        const recursive = (branch: { name: string, lines: number, referenced_table: string[]; }[]) => {
            const table = branch[branch.length - 1];
            while (table.referenced_table.length > 0) {
                const tableName = table.referenced_table.pop();
                const referencedTable = tables.find((t) => {
                    return t.name === tableName;
                });
                if (referencedTable) recursive(([] as any).concat(branch, referencedTable));
            };

            if (table.referenced_table.length === 0) {
                if (this.tables.find((t) => t.name.toLowerCase() === table.name.toLowerCase())) return;
                this.tables.push({
                    name: table.name,
                    lines: table.lines,
                    columns: [],
                });
                branch.pop();
                return;
            }
        };

        tables.forEach((table) => {
            recursive([table]);
        });
    };

    public extractColumns = async () => {
        for (const table of this.tables) {
            const customTable: Table = Object.assign({
                name: '',
                columns: [],
                lines: 0
            }, this.customSchema.tables?.find(t => t.name?.toLowerCase() === table.name.toLowerCase()));
            const columns: MySQLColumn[] = await this.dbConnection.select()
                .from('information_schema.COLUMNS')
                .where({ 'TABLE_NAME': table.name });

            columns
                .filter((column: MySQLColumn) => {
                    return ['enum', 'set'].includes(column.DATA_TYPE || '');
                }).forEach((column: MySQLColumn) => {
                    column.NUMERIC_PRECISION = column.COLUMN_TYPE.match(/[enum,set]\((.*)\)$/)![1].split('\',\'').length;
                });

            table.columns = columns.map((column: MySQLColumn) => {
                const options: Column['options'] = {
                    max: 0,
                    min: 0,
                    autoIncrement: false,
                    nullable: false,
                    unique: false,
                    unsigned: false
                };
                if (column.IS_NULLABLE === 'YES') options.nullable = true;
                options.max = column.CHARACTER_MAXIMUM_LENGTH || column.NUMERIC_PRECISION;
                if (column.COLUMN_TYPE.includes('unsigned')) options.unsigned = true;
                if (column.EXTRA.includes('auto_increment')) options.autoIncrement = true;
                return {
                    name: column.COLUMN_NAME,
                    generator: column.DATA_TYPE,
                    options,
                };
            });

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
                'kcu.column_name',
                'kcu.referenced_table_name',
                'kcu.referenced_column_name',
                'unique_index'
            ])
                .from('information_schema.key_column_usage as kcu')
                .leftJoin(subQuery, function () {
                    this.on('kcu.table_name', 'indexes.table_name')
                        .andOn('kcu.column_name', 'indexes.column_name')
                        .andOn('kcu.constraint_schema', 'indexes.constraint_schema');
                })
                .where('kcu.table_name', table.name)
                .whereNotNull('kcu.referenced_column_name');

            for (let c = 0; c < table.columns.length; c++) {
                const column = table.columns[c];
                const customColumn = customTable.columns.find(cc => cc.name.toLowerCase() === column.name.toLowerCase());
                const match = foreignKeys.find((fk) => fk.column_name.toLowerCase() === column.name.toLowerCase());
                if (match) {
                    column.foreignKey = { table: match.referenced_table_name, column: match.referenced_column_name };
                    column.options.unique = match.unique_index;
                }
                if (customColumn) {
                    column.options = Object.assign({}, column.options, customColumn.options);
                    column.foreignKey = customColumn.foreignKey;
                    column.values = customColumn.values;
                }
            }
        }
    };

    public generateJson(): Schema {
        return {
            maxCharLength: this.customSchema.maxCharLength || DEFAULT_MAX_CHAR_LENGTH,
            tables: this.tables,
            values: this.values,
        };
    }
}