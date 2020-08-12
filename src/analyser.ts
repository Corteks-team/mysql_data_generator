import { ColumnOptions } from './column';
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
    constructor(
        private dbConnector: DatabaseConnector,
        private customSchema: Schema,
    ) { 
        /** @todo: Remove deprecated warning */
        let useDeprecatedLines = false
        customSchema.tables.forEach((table) => {
            if(table.lines) {
                useDeprecatedLines = true;
                table.maxLines = table.lines;
            }
        })
        if(useDeprecatedLines) console.warn('DEPRECATED: Table.lines is deprecated, please use table.maxLines instead.');
        /****************/
    }

    public async analyse() {
        let tables = await this.dbConnector.getTablesInformation(this.customSchema.ignoredTables);

        tables = await Promise.all(tables.map(async (table) => {
            await this.customizeTable(table);
            await this.extractColumns(table);
            await this.extractForeignKeys(table);
            return table;
        }));

        return this.generateJson(this.orderTablesByForeignKeys(tables));
    }

    private async customizeTable(table: TableWithForeignKeys): Promise<void> {
        if (this.customSchema.tables) {
            const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
            if (customTable) {
                table.maxLines = customTable.maxLines;
                table.before = customTable.before;
                table.after = customTable.after;
            }
        }
    }

    private async extractColumns(table: TableWithForeignKeys) {
        const columns: MySQLColumn[] = await this.dbConnector.getColumnsInformation(table);

        columns
            .filter((column: MySQLColumn) => {
                return ['enum', 'set'].includes(column.DATA_TYPE || '');
            }).forEach((column: MySQLColumn) => {
                column.NUMERIC_PRECISION = column.COLUMN_TYPE.match(/[enum,set]\((.*)\)$/)![1].split('\',\'').length;
            });

        table.columns = columns.map((column: MySQLColumn) => {
            const options: ColumnOptions = {
                max: 0,
                min: 0,
                autoIncrement: false,
                nullable: false,
                unique: false,
                unsigned: false
            };
            if (column.COLUMN_KEY.match(/PRI|UNI/ig)) options.unique = true;
            if (column.IS_NULLABLE === 'YES') options.nullable = true;
            options.max = column.CHARACTER_MAXIMUM_LENGTH || column.NUMERIC_PRECISION;
            if (column.COLUMN_TYPE.includes('unsigned')) options.unsigned = true;
            if (column.EXTRA.includes('auto_increment')) options.autoIncrement = true;
            if (['timestamp', 'datetime', 'date'].includes(column.DATA_TYPE)) options.minDate = this.customSchema.minDate;
            switch (column.DATA_TYPE) {
                case 'bit':
                    break;
                case 'tinyint':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 255;
                    } else {
                        options.min = -128;
                        options.max = 127;
                    }
                    break;
                case 'bool':
                case 'boolean':
                    break;
                case 'smallint':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 65535;
                    } else {
                        options.min = -32768;
                        options.max = 32767;
                    }
                    break;
                case 'mediumint':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 16777215;
                    } else {
                        options.min = -8388608;
                        options.max = 8388607;
                    }
                    break;
                case 'int':
                case 'integer':
                case 'bigint':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 2147483647;
                    } else {
                        options.min = -2147483648;
                        options.max = 2147483647;
                    }
                    break;
                case 'decimal':
                case 'dec':
                case 'float':
                case 'double':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 2147483647;
                    } else {
                        options.min = -2147483648;
                        options.max = 2147483647;
                    }
                    break;
                case 'date':
                case 'datetime':
                case 'timestamp':
                    options.minDate = this.customSchema.minDate || '01-01-1970';
                    options.maxDate = undefined;
                    break;
                case 'time':
                    break;
                case 'year':
                    options.min = parseInt(this.customSchema.minDate.substring(6)) || 1901;
                    options.max = 2155;
                    break;
                case 'varchar':
                case 'char':
                case 'binary':
                case 'varbinary':
                    break;
                case 'tinyblob':
                    break;
                case 'text':
                case 'mediumtext':
                case 'longtext':
                    break;
                case 'blob':
                case 'mediumblob': // 16777215
                case 'longblob': // 4,294,967,295
                    break;
                case 'set':
                    break;
                case 'enum':
                    break;
            }
            return {
                name: column.COLUMN_NAME,
                generator: column.DATA_TYPE,
                options,
            };
        });
    }

    private extractForeignKeys = async (table: TableWithForeignKeys) => {
        const foreignKeys = await this.dbConnector.getForeignKeys(table);

        const customTable: Table = Object.assign({
            name: '',
            columns: [],
            maxLines: 0,
        }, this.customSchema.tables.find(t => t.name.toLowerCase() === table.name.toLowerCase()));
        for (let c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            const customColumn = customTable.columns.find(cc => cc.name.toLowerCase() === column.name.toLowerCase());
            const match = foreignKeys.find((fk) => fk.column.toLowerCase() === column.name.toLowerCase());
            if (match) {
                column.foreignKey = { table: match.foreignTable, column: match.foreignColumn };
                column.options.unique = column.options.unique || match.uniqueIndex;
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
        let sortedTables: Table[] = [];
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
                sortedTables.push({
                    name: table.name,
                    maxLines: table.maxLines,
                    columns: table.columns,
                    before: table.before,
                    after: table.after,
                });
                branch.pop();
                return;
            }
        };

        tables.forEach((table) => {
            recursive([table]);
        });
        return sortedTables;
    };

    private generateJson(tables: Table[]): Schema {
        return {
            maxCharLength: this.customSchema.maxCharLength || DEFAULT_MAX_CHAR_LENGTH,
            minDate: this.customSchema.minDate || DEFAULT_MIN_DATE,
            ignoredTables: this.customSchema.ignoredTables,
            tables: tables,
            values: this.customSchema.values,
        };
    }
}