import { Column } from './column';
import { MySQLColumn } from './database/mysql-column';
import { Table } from './table';
import { DatabaseConnector } from './database/database-connector-builder';

export interface Schema {
    maxCharLength: number;
    minDate: string;
    ignoredTables: string[];
    tables: Table[];
    values: { [key: string]: any[]; };
}

export interface TableWithForeignKeys extends Table {
    referencedTables: string[];
}

const DEFAULT_MAX_CHAR_LENGTH: number = 255;
const DEFAULT_MIN_DATE: string = '01-01-1970';

export const dummyCustomSchema: Schema = {
    maxCharLength: DEFAULT_MAX_CHAR_LENGTH,
    minDate: DEFAULT_MIN_DATE,
    ignoredTables: [],
    tables: [],
    values: {}
};

export class Analyser {
    private values: { [key: string]: any[]; } = {};

    constructor(
        private dbConnector: DatabaseConnector,
        private database: string,
        private customSchema: Schema,
    ) { }

    public async analyse() {
        let tables = await this.extractTables();

        tables = await Promise.all(tables.map(async (table) => {
            await this.customizeTable(table);
            await this.extractColumns(table);
            await this.extractForeignKeys(table);
            return table;
        }));

        this.orderTablesByForeignKeys(tables);
        return this.generateJson(tables);
    }

    private extractTables = async () => {
        return await this.dbConnector.getTablesInformation(this.customSchema.ignoredTables);
    };

    private async customizeTable(table: TableWithForeignKeys): Promise<void> {
        if (this.customSchema.tables) {
            const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
            if (customTable) {
                table.lines = customTable.lines;
                table.before = customTable.before;
                table.after = customTable.after;
            }
        }
    }

    private extractColumns = async (table: TableWithForeignKeys) => {
        const columns: MySQLColumn[] = await this.dbConnector.getColumnsInformation(table);

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
            if (['timestamp', 'datetime', 'date'].includes(column.DATA_TYPE)) options.min = this.customSchema.minDate;
            return {
                name: column.COLUMN_NAME,
                generator: column.DATA_TYPE,
                options,
            };
        });
    };

    private extractForeignKeys = async (table: TableWithForeignKeys) => {
        const foreignKeys = await this.dbConnector.getForeignKeys(table);

        const customTable: Table = this.customSchema.tables.find(t => t.name.toLowerCase() === table.name.toLowerCase()) || {
            name: '',
            columns: [],
            lines: 0,
        };
        for (let c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            const customColumn = customTable.columns.find(cc => cc.name.toLowerCase() === column.name.toLowerCase());
            const match = foreignKeys.find((fk) => fk.column.toLowerCase() === column.name.toLowerCase());
            if (match) {
                column.foreignKey = { table: match.foreignTable, column: match.foreignColumn };
                column.options.unique = match.unique;
            }
            if (customColumn) {
                column.options = Object.assign({}, column.options, customColumn.options);
                column.foreignKey = customColumn.foreignKey;
                column.values = customColumn.values;
            }
            if (column.foreignKey) {
                table.referencedTables.push(column.foreignKey.table);
            }
        }
    };

    private orderTablesByForeignKeys(tables: TableWithForeignKeys[]) {
        let sortedTables: TableWithForeignKeys[] = [];
        const recursive = (branch: TableWithForeignKeys[]) => {
            const table = branch[branch.length - 1];
            while (table.referencedTables.length > 0) {
                const tableName = table.referencedTables.pop();
                const referencedTable = tables.find((t) => {
                    return t.name === tableName;
                });
                if (referencedTable) recursive(([] as any).concat(branch, referencedTable));
            };

            if (table.referencedTables.length === 0) {
                if (sortedTables.find((t) => t.name.toLowerCase() === table.name.toLowerCase())) return;
                sortedTables.push(table);
                branch.pop();
                return;
            }
        };

        tables.forEach((table) => {
            recursive([table]);
        });
        return sortedTables;
    }

    private generateJson(tables: TableWithForeignKeys[]): Schema {
        return {
            maxCharLength: this.customSchema.maxCharLength || DEFAULT_MAX_CHAR_LENGTH,
            minDate: this.customSchema.minDate || DEFAULT_MIN_DATE,
            ignoredTables: this.customSchema.ignoredTables,
            tables: tables,
            values: this.values,
        };
    }
}