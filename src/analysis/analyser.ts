import { ColumnOptions } from '../column';
import { MySQLColumn } from '../database/mysql-column';
import { DatabaseConnector } from '../database/database-connector-builder';
import { Schema } from '../schema.interface';
import { Table } from '../table-descriptor.interface';
import { Logger } from 'log4js';


export class Analyser {
    constructor(
        private dbConnector: DatabaseConnector,
        private logger: Logger
    ) { }

    public async analyse(): Promise<Schema> {
        let tables = await this.dbConnector.getTablesInformation();
        tables = await Promise.all(tables.map(async (table) => {
            await this.extractColumns(table);
            await this.extractForeignKeys(table);
            return table;
        }));
        return { tables: tables };
    }

    private async extractColumns(table: Table) {
        this.logger.info(table.name);
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
            if (column.COLUMN_KEY && column.COLUMN_KEY.match(/PRI|UNI/ig)) options.unique = true;
            if (column.IS_NULLABLE === 'YES') options.nullable = true;
            options.max = column.CHARACTER_MAXIMUM_LENGTH || column.NUMERIC_PRECISION;
            if (column.COLUMN_TYPE && column.COLUMN_TYPE.includes('unsigned')) options.unsigned = true;
            if (column.EXTRA && column.EXTRA.includes('auto_increment')) options.autoIncrement = true;
            switch (column.DATA_TYPE) {
                case 'bit':
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
                case 'tinyint':
                    if (options.unsigned) {
                        options.min = 0;
                        options.max = 255;
                    } else {
                        options.min = -128;
                        options.max = 127;
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
                    options.minDate = '01-01-1970';
                    options.maxDate = undefined;
                    break;
                case 'time':
                    break;
                case 'year':
                    options.min = 1901;
                    options.max = 2155;
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
                case 'set':
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

    private extractForeignKeys = async (table: Table) => {
        const foreignKeys = await this.dbConnector.getForeignKeys(table);
        for (let c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            const match = foreignKeys.find((fk) => fk.column.toLowerCase() === column.name.toLowerCase());
            if (match) {
                column.foreignKey = { table: match.foreignTable, column: match.foreignColumn };
                column.options.unique = column.options.unique || match.uniqueIndex;
                table.referencedTables.push(column.foreignKey.table);
            }
        }
    };
}