import * as Knex from 'knex';
import { Randomizer } from './randomizer';
import { Column } from './column';

export interface Table {
    name: string;
    lines: number;
    columns: Column[];
}

export class TableService {
    private foreignValues: Record<string, any[]> = {};

    constructor(
        private dbConnection: Knex,
        private maxCharLength: number,
        private values: { [key: string]: any[]; }
    ) { }

    async getForeignValues(table: string, column: string): Promise<any[]> {
        const pointer = `${table}.${column}`;
        if (!this.foreignValues[pointer] || this.foreignValues[pointer].length === 0) {
            this.foreignValues[pointer] = (await this.dbConnection(table).distinct(column)).map(result => result[column]);
        }
        return [].concat(this.foreignValues[pointer]);
    }

    async getLines(table: Table) {
        const nbLines = (await this.dbConnection(table.name).count())[0]['count(*)'] as number;
        return nbLines;
    }

    async empty(table: Table) {
        console.log('empty: ', table.name);
        await this.dbConnection.raw('SET FOREIGN_KEY_CHECKS = 0;');
        await this.dbConnection.raw(`DELETE FROM ${table.name}`);
        await this.dbConnection.raw(`ALTER TABLE ${table.name} AUTO_INCREMENT = 1;`);
    }

    async fill(table: Table) {
        console.log('fill: ', table.name);
        let currentNbRows: number = await this.getLines(table);
        while (currentNbRows < table.lines) {
            const rows = [];
            const runRows = Math.min(10000, table.lines - currentNbRows);
            for (let i = 0; i < runRows; i++) {
                const row = {};
                for (var c = 0; c < table.columns.length; c++) {
                    const column = table.columns[c];
                    if (column.options.autoIncrement) continue;
                    if (column.foreignKey) {
                        const values = await this.getForeignValues(column.foreignKey.table, column.foreignKey.column);
                        if (column.options.nullable) values.push(null);
                        row[column.name] = values[Randomizer.randomInt(0, values.length - 1)];
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
                                row[column.name] = Randomizer.randomInt(0, 2147483647);
                            } else {
                                row[column.name] = Randomizer.randomInt(-2147483648, 2147483647);
                            }
                            if (column.options.nullable && Math.random() <= 0.1) row[column.name] = null;
                            break;
                        case 'decimal':
                        case 'dec':
                        case 'float':
                        case 'double':
                            row[column.name] = Math.random();
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
                            row[column.name] = Randomizer.randomString(Randomizer.randomInt(column.options.min, Math.min(this.maxCharLength, column.options.max)));
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
            //await this.dbConnection.raw('SET foreign_key_checks = 0;')
            const query = await this.dbConnection(table.name)
                .insert(rows)
                .toQuery()
                .replace('insert into', 'insert ignore into');
            const insertResult = await this.dbConnection.raw(query);
            currentNbRows += insertResult[0].affectedRows;
            console.log(currentNbRows + ' / ' + table.lines);
        }
    }
}