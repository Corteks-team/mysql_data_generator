import { Random, MersenneTwister19937 } from "random-js";
import { CustomizedSchema, CustomizedTable } from '../customized-schema.class';
import { Table } from '../schema.class';
import { DatabaseConnector } from '../database/database-connector-builder';
import { EventEmitter } from 'events';

export interface ProgressEvent {
    step: string;
    currentTable: string;
    currentValue: number;
    max: number;
    comment: string;
}

export class Generator extends EventEmitter {
    private random: Random;
    private continue: boolean = false;

    constructor(
        private dbConnector: DatabaseConnector,
        private schema: CustomizedSchema,
    ) {
        super();
        if (schema.settings.seed) {
            this.random = new Random(MersenneTwister19937.seed(schema.settings.seed));
        } else {
            this.random = new Random(MersenneTwister19937.autoSeed());
        }
    }

    public gotoNextTable() {
        this.continue = true;
    }

    private async empty(table: Table) {
        this.emit('progress', { currentTable: table.name, step: 'empty', currentValue: 0, max: 1 } as ProgressEvent);
        await this.dbConnector.emptyTable(table);
        this.emit('progress', { currentTable: table.name, step: 'empty', currentValue: 1, max: 1 } as ProgressEvent);
    }

    private async getForeignKeyValues(table: CustomizedTable, tableForeignKeyValues: { [key: string]: any[]; } = {}, runRows: number) {
        const columns = table.columns.filter((column) => column.foreignKey);
        /** @TODO: parallelize foreign key gathering */
        for (var c = 0; c < columns.length; c++) {
            this.emit('progress', { currentTable: table.name, step: 'foreignkeys', currentValue: c, max: columns.length } as ProgressEvent);
            const column = columns[c];
            const foreignKey = column.foreignKey!;
            let values = await this.dbConnector.getValuesForForeignKeys(
                table.name,
                column.name,
                foreignKey.table,
                foreignKey.column,
                runRows,
                column.options.unique,
                foreignKey.where,
            );
            tableForeignKeyValues[`${column.name}_${foreignKey.table}_${foreignKey.column}`] = values;
            this.emit('progress', { currentTable: table.name, step: 'foreignkeys', currentValue: c + 1, max: columns.length } as ProgressEvent);
        }
    }

    public async fillTables(reset: boolean = false) {
        this.beforeAll();
        for (const table of this.schema.tables) {
            await this.fill(table, reset);
        }
        this.afterAll();
    }

    private async fill(table: CustomizedTable, reset: boolean = false) {
        if (reset) await this.empty(table);
        let handleTriggers = table.disableTriggers || (table.disableTriggers === undefined && this.schema.settings.disableTriggers);
        if (handleTriggers) await this.dbConnector.disableTriggers(table.name);
        await this.before(table);
        const insertedRows = await this.generateData(table);
        if (insertedRows) await this.after(table);
        if (handleTriggers) await this.dbConnector.enableTriggers(table.name);
    }

    private async beforeAll() {
        if (!this.schema.settings.beforeAll) return;

        for (let i = 0; i < this.schema.settings.beforeAll.length; i++) {
            this.emit('progress', { currentTable: '', step: 'beforeAll', currentValue: i, max: this.schema.settings.beforeAll.length } as ProgressEvent);
            await this.dbConnector.executeRawQuery(this.schema.settings.beforeAll[i]);
        }
    }

    private async afterAll() {
        if (!this.schema.settings.afterAll) return;

        for (let i = 0; i < this.schema.settings.afterAll.length; i++) {
            this.emit('progress', { currentTable: '', step: 'afterAll', currentValue: i, max: this.schema.settings.afterAll.length } as ProgressEvent);
            await this.dbConnector.executeRawQuery(this.schema.settings.afterAll[i]);
        }
    }

    private async before(table: CustomizedTable) {
        if (!table.before) return;

        for (let i = 0; i < table.before.length; i++) {
            this.emit('progress', { currentTable: table.name, step: 'before', currentValue: i, max: table.before.length } as ProgressEvent);
            await this.dbConnector.executeRawQuery(table.before[i]);
        }
    }

    private async generateData(table: CustomizedTable): Promise<number> {
        const tableForeignKeyValues: { [key: string]: any[]; } = {};

        let previousRunRows: number = -1;

        let currentNbRows: number = await this.dbConnector.countLines(table);
        let maxLines = 0;
        if (table.addLines) {
            maxLines = currentNbRows + table.addLines;
            if (table.maxLines !== undefined) maxLines = Math.min(maxLines, table.maxLines);
        }
        else if (table.maxLines) maxLines = table.maxLines;
        let insertedRows = 0;

        let deltaRows = maxLines - currentNbRows;
        try {
            await this.getForeignKeyValues(table, tableForeignKeyValues, deltaRows);
        } catch (ex) {
            console.warn(ex.message);
        }

        let currentTableRow = 0;
        this.emit('progress', { currentTable: table.name, step: 'generateData', currentValue: currentNbRows, max: maxLines } as ProgressEvent);
        TABLE_LOOP: while (currentNbRows < maxLines) {
            previousRunRows = currentNbRows;

            const rows = [];
            const runRows = Math.min(1000, maxLines - currentNbRows);

            BATCH_LOOP: for (let currentBatchRow = 0; currentBatchRow < runRows; currentBatchRow++) {
                const row: { [key: string]: any; } = {};
                for (var c = 0; c < table.columns.length; c++) {
                    const column = table.columns[c];
                    if (column.autoIncrement) continue;
                    if (column.values) {
                        let parsedValues: ParsedValues = [];
                        let values: Values = column.values;
                        if (typeof values === 'string') {
                            values = this.schema.settings.values[values] as ParsedValues | ValuesWithRatio;
                        }
                        if (!(values instanceof Array)) {
                            Object.keys(values).forEach((key: string) => {
                                let arr = new Array(Math.round((values as ValuesWithRatio)[key] * 100));
                                arr = arr.fill(key);
                                parsedValues = parsedValues.concat(arr);
                            });
                        } else {
                            parsedValues = values;
                        }
                        row[column.name] = this.random.pick(parsedValues);
                        continue;
                    }
                    if (column.foreignKey) {
                        const foreignKeys = tableForeignKeyValues[`${column.name}_${column.foreignKey.table}_${column.foreignKey.column}`];
                        if (currentTableRow >= foreignKeys.length && !column.options.nullable && column.options.unique) {
                            console.warn(`${table.name}: Not enough values available for foreign key ${table.name}.${column.name}`);
                            break BATCH_LOOP;
                        }
                        if (currentTableRow >= foreignKeys.length && column.options.unique && column.options.nullable) continue;
                        row[column.name] = foreignKeys[currentTableRow % foreignKeys.length];
                        continue;
                    }
                    switch (column.generator) {
                        case 'set':
                        case 'bit':
                            row[column.name] = this.random.integer(0, Math.pow(2, column.max));
                            break;
                        case 'bool':
                        case 'boolean':
                            row[column.name] = this.random.bool();
                            break;
                        case 'smallint':
                        case 'mediumint':
                        case 'tinyint':
                        case 'int':
                        case 'integer':
                        case 'bigint':
                            row[column.name] = this.random.integer(column.min, column.max);
                            break;
                        case 'decimal':
                        case 'dec':
                        case 'float':
                        case 'double':
                            row[column.name] = this.random.real(column.min, column.max);
                            break;
                        case 'date':
                        case 'datetime':
                        case 'timestamp':
                            const min = column.min ? new Date(column.min) : new Date('01-01-1970');
                            const max = column.max ? new Date(column.max) : new Date();
                            row[column.name] = this.random.date(min, max);
                            break;
                        case 'time':
                            const hours = this.random.integer(-838, +838);
                            const minutes = this.random.integer(-0, +59);
                            const seconds = this.random.integer(-0, +59);
                            row[column.name] = `${hours}:${minutes}:${seconds}`;
                            break;
                        case 'year':
                            row[column.name] = this.random.integer(column.min, column.max);
                            break;
                        case 'varchar':
                        case 'char':
                        case 'binary':
                        case 'varbinary':
                        case 'tinytext':
                        case 'text':
                        case 'mediumtext':
                        case 'longtext':
                        case 'tinyblob':
                        case 'blob':
                        case 'mediumblob': // 16777215
                        case 'longblob': // 4,294,967,295
                            if (column.max >= 36 && column.unique) {
                                row[column.name] = this.random.uuid4();
                            } else {
                                row[column.name] = this.random.string(this.random.integer(column.min, column.max));
                            }
                            break;
                        case 'enum':
                            row[column.name] = Math.floor(this.random.realZeroToOneExclusive() * (column.max)) + 1;
                            break;
                    }
                    if (column.nullable && this.random.realZeroToOneExclusive() <= 0.1) row[column.name] = null;
                }
                rows.push(row);
                currentTableRow++;
            }
            insertedRows = await this.dbConnector.insert(table.name, rows);
            currentNbRows += insertedRows;
            if (previousRunRows === currentNbRows) {
                console.warn(`Last run didn't insert any new rows in ${table.name}`);
                break TABLE_LOOP;
            }
            this.emit('progress', { currentTable: table.name, step: 'generateData', currentValue: currentNbRows, max: maxLines } as ProgressEvent);
            if (this.continue) {
                this.continue = false;
                break TABLE_LOOP;
            }
        }
        return insertedRows;
    }

    private async after(table: CustomizedTable) {
        if (!table.after) return;

        for (let i = 0; i < table.after.length; i++) {
            this.emit('progress', { currentTable: table.name, step: 'before', currentValue: i, max: table.after.length } as ProgressEvent);
            await this.dbConnector.executeRawQuery(table.after[i]);
        }
    }
}