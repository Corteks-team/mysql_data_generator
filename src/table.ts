import { Randomizer } from './randomizer';
import { Column } from './column';
import { DatabaseConnector } from './database/database-connector-builder';

export interface Table {
    name: string;
    lines: number;
    columns: Column[];
    before?: string[];
    after?: string[];
}

export class TableService {
    constructor(
        private dbConnector: DatabaseConnector,
        private maxCharLength: number,
        private values: { [key: string]: any[]; }
    ) { }

    private async empty(table: Table) {
        console.log('empty: ', table.name);
        await this.dbConnector.emptyTable(table);
    }

    private async getForeignKeyValues(table: Table, tableForeignKeyValues: { [key: string]: any[]; } = {}, runRows: number) {
        for (var c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            if (column.foreignKey) {
                const foreignKey = column.foreignKey;
                let values = await this.dbConnector.getValuesForForeignKeys(
                    table.name,
                    column.name,
                    column.foreignKey.table,
                    column.foreignKey.column,
                    runRows,
                    column.options.unique,
                    column.foreignKey.where,
                );
                if (values.length === 0 && !column.options.nullable) {
                    throw new Error(`${table}: Not enough values available for foreign key ${foreignKey.table}.${foreignKey.column}`);
                }
                tableForeignKeyValues[`${column.name}_${foreignKey.table}_${foreignKey.column}`] = values;
            }
        }
    }

    public async fill(table: Table, reset: boolean) {
        if (reset) await this.empty(table);
        console.log('fill: ', table.name);
        await this.before(table);
        await this.generateData(table);
        await this.after(table);
    }

    private async before(table: Table) {
        if (!table.before) return;

        for (const query of table.before) {
            await this.dbConnector.executeRawQuery(query);
        }
    }

    private async generateData(table: Table) {
        const tableForeignKeyValues: { [key: string]: any[]; } = {};
        try {
            await this.getForeignKeyValues(table, tableForeignKeyValues, 0);
        } catch (ex) {
            console.warn(ex.message);
            return;
        }

        let previousRunRows: number = -1;

        let currentNbRows: number = await this.dbConnector.countLines(table);
        batch: while (currentNbRows < table.lines) {
            previousRunRows = currentNbRows;

            const rows = [];
            const runRows = Math.min(1000, table.lines - currentNbRows);

            try {
                await this.getForeignKeyValues(table, tableForeignKeyValues, runRows);
            } catch (ex) {
                console.warn(ex.message);
                break batch;
            }

            for (let i = 0; i < runRows; i++) {
                const row: { [key: string]: any; } = {};
                for (var c = 0; c < table.columns.length; c++) {
                    const column = table.columns[c];
                    if (column.options.autoIncrement) continue;
                    if (column.foreignKey) {
                        const foreignKeys = tableForeignKeyValues[`${column.name}_${column.foreignKey.table}_${column.foreignKey.column}`];
                        row[column.name] = foreignKeys[Randomizer.randomInt(0, foreignKeys.length - 1)];
                        continue;
                    }
                    if (column.values) {
                        if (Array.isArray(column.values)) {
                            row[column.name] = column.values[Randomizer.randomInt(0, column.values.length - 1)];
                        } else {
                            row[column.name] = this.values[column.values][Randomizer.randomInt(0, this.values[column.values].length - 1)];
                        }
                        continue;
                    }
                    switch (column.generator) {
                        case 'bit':
                            row[column.name] = Randomizer.randomBit(column.options.max);
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'tinyint':
                            if (column.options.unsigned) {
                                row[column.name] = Randomizer.randomInt(0, 255);
                            } else {
                                row[column.name] = Randomizer.randomInt(-128, 127);
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'bool':
                        case 'boolean':
                            row[column.name] = Randomizer.randomInt(0, 1);
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'smallint':
                            if (column.options.unsigned) {
                                row[column.name] = Randomizer.randomInt(0, 65535);
                            } else {
                                row[column.name] = Randomizer.randomInt(-32768, 32767);
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'mediumint':
                            if (column.options.unsigned) {
                                row[column.name] = Randomizer.randomInt(0, 16777215);
                            } else {
                                row[column.name] = Randomizer.randomInt(-8388608, 8388607);
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'int':
                        case 'integer':
                        case 'bigint':
                            if (column.options.unsigned) {
                                row[column.name] = Randomizer.randomInt((column.options.min !== undefined ? column.options.min as number : 0), (column.options.max !== undefined ? column.options.max as number : 2147483647));
                            } else {
                                row[column.name] = Randomizer.randomInt((column.options.min !== undefined ? column.options.min as number : -2147483648), (column.options.max !== undefined ? column.options.max as number : 2147483647));
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'decimal':
                        case 'dec':
                        case 'float':
                        case 'double':
                            if (column.options.unsigned) {
                                row[column.name] = Randomizer.randomFloat((column.options.min !== undefined ? column.options.min as number : 0), (column.options.max !== undefined ? column.options.max as number : 2147483647));
                            } else {
                                row[column.name] = Randomizer.randomFloat((column.options.min !== undefined ? column.options.min as number : -2147483648), (column.options.max !== undefined ? column.options.max as number : 2147483647));
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'date':
                        case 'datetime':
                        case 'timestamp':
                            const min = column.options.min ? new Date(column.options.min) : new Date('01-01-1970');
                            const max = column.options.max ? new Date(column.options.max) : new Date();
                            row[column.name] = Randomizer.randomDate(min, max);
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'time':
                            const hours = Randomizer.randomInt(-838, +838);
                            const minutes = Randomizer.randomInt(-0, +59);
                            const seconds = Randomizer.randomInt(-0, +59);
                            row[column.name] = `${hours}:${minutes}:${seconds}`;
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'year':
                            row[column.name] = Randomizer.randomInt(1901, 2155);
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'varchar':
                        case 'char':
                        case 'binary':
                        case 'varbinary':
                            row[column.name] = Randomizer.randomString(Randomizer.randomInt(column.options.min as number, Math.min(this.maxCharLength, column.options.max)));
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'tinyblob':
                            row[column.name] = Randomizer.randomString(Randomizer.randomInt(0, 10));
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'text':
                        case 'mediumtext':
                        case 'longtext':
                            row[column.name] = Randomizer.randomString(Randomizer.randomInt(0, Math.min(this.maxCharLength, column.options.max)));
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'blob':
                        case 'mediumblob': // 16777215
                        case 'longblob': // 4,294,967,295
                            row[column.name] = Randomizer.randomString(Randomizer.randomInt(0, Math.min(this.maxCharLength, column.options.max)));
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'set':
                            row[column.name] = Randomizer.randomBit(column.options.max);
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'enum':
                            if (column.options.nullable) {
                                row[column.name] = Math.floor(Math.random() * (column.options.max + 1));
                            } else {
                                row[column.name] = Math.floor(Math.random() * (column.options.max)) + 1;
                            }
                            break;
                    }
                }
                rows.push(row);
            }
            currentNbRows += await this.dbConnector.insert(table.name, rows);
            if (previousRunRows === currentNbRows) {
                console.warn(`Last run didn't insert any new rows in ${table.name}`);
                break batch;
            }
            console.log(currentNbRows + ' / ' + table.lines);
        }
    }

    private async after(table: Table) {
        if (!table.after) return;

        for (const query of table.after) {
            await this.dbConnector.executeRawQuery(query);
        }
    }
}