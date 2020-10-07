import { Random, MersenneTwister19937 } from "random-js";
import { Logger } from 'log4js';
import { CustomizedSchema, CustomizedTable } from '../schema/customized-schema.class';
import { Table } from '../schema/schema.class';
import { DatabaseConnector } from '../database/database-connector-builder';
import { AbstractGenerator, Generators } from "./generators/generators";
import { BitGenerator, BooleanGenerator, DateGenerator, IntegerGenerator, RealGenerator, StringGenerator, TimeGenerator } from './generators';

export class Filler {
    private random: Random;
    private continue: boolean = false;

    constructor(
        private dbConnector: DatabaseConnector,
        private schema: CustomizedSchema,
        private logger: Logger
    ) {
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
        this.logger.info('empty: ', table.name);
        await this.dbConnector.emptyTable(table);
    }

    private async getForeignKeyValues(table: CustomizedTable, tableForeignKeyValues: { [key: string]: any[]; } = {}, runRows: number) {
        const columns = table.columns.filter((column) => column.foreignKey);

        const foreignKeyPromises = columns.map((column, index) => {
            const foreignKey = column.foreignKey!;
            return this.dbConnector.getValuesForForeignKeys(
                table.name,
                column.name,
                foreignKey.table,
                foreignKey.column,
                runRows,
                column.unique,
                foreignKey.where,
            ).then((values) => {
                tableForeignKeyValues[`${column.name}_${foreignKey.table}_${foreignKey.column}`] = values;
            });
        });
        await Promise.all(foreignKeyPromises);
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
        this.logger.info('fill: ', table.name);
        let handleTriggers = table.disableTriggers || (table.disableTriggers === undefined && this.schema.settings.disableTriggers);
        if (handleTriggers) await this.dbConnector.disableTriggers(table.name);
        await this.before(table);
        const insertedRows = await this.generateData(table);
        if (insertedRows) await this.after(table);
        if (handleTriggers) await this.dbConnector.enableTriggers(table.name);
    }

    private async beforeAll() {
        if (!this.schema.settings.beforeAll) return;

        for (const query of this.schema.settings.beforeAll) {
            await this.dbConnector.executeRawQuery(query);
        }
    }

    private async afterAll() {
        if (!this.schema.settings.afterAll) return;

        for (const query of this.schema.settings.afterAll) {
            await this.dbConnector.executeRawQuery(query);
        }
    }

    private async before(table: CustomizedTable) {
        if (!table.before) return;

        for (const query of table.before) {
            await this.dbConnector.executeRawQuery(query);
        }
    }

    private async generateData(table: CustomizedTable): Promise<number> {
        const tableForeignKeyValues: { [key: string]: any[]; } = {};

        let previousRunRows: number = -1;

        let currentNbRows: number = await this.dbConnector.countLines(table);
        let maxLines = 0;
        if (table.addLines !== undefined) {
            maxLines = currentNbRows + table.addLines;
            if (table.maxLines !== undefined) maxLines = Math.min(maxLines, table.maxLines);
        }
        else if (table.maxLines !== undefined) maxLines = table.maxLines;
        let insertedRows = 0;

        let deltaRows = maxLines - currentNbRows;
        try {
            await this.getForeignKeyValues(table, tableForeignKeyValues, deltaRows);
        } catch (ex) {
            this.logger.warn(ex.message);
        }

        let currentTableRow = 0;
        this.logger.info(currentNbRows + ' / ' + maxLines);

        const generators: AbstractGenerator<any>[] = [];
        for (var c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            switch (column.generator) {
                case Generators.bit:
                    generators.push(new BitGenerator(this.random, table, column));
                    break;
                case Generators.boolean:
                    generators.push(new BooleanGenerator(this.random, table, column));
                    break;
                case Generators.integer:
                    generators.push(new IntegerGenerator(this.random, table, column));
                    break;
                case Generators.real:
                    generators.push(new RealGenerator(this.random, table, column));
                    break;
                case Generators.date:
                    generators.push(new DateGenerator(this.random, table, column));
                    break;
                case Generators.time:
                    generators.push(new TimeGenerator(this.random, table, column));
                    break;
                case Generators.string:
                    generators.push(new StringGenerator(this.random, table, column));
                    break;
                default:
                case Generators.none:
                    throw new Error(`No generator defined for column: ${table.name}.${column.name}`);
            }
            generators[c].init();
        }

        TABLE_LOOP: while (currentNbRows < maxLines) {
            previousRunRows = currentNbRows;

            const rows = [];
            const runRows = Math.min(this.schema.settings.maxRowsPerBatch, maxLines - currentNbRows);

            for (let currentBatchRow = 0; currentBatchRow < runRows; currentBatchRow++) {
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
                        if (foreignKeys.length > 0) row[column.name] = foreignKeys[currentTableRow % foreignKeys.length];
                        continue;
                    }
                    row[column.name] = generators[c].generate(currentTableRow, row);
                    if (column.nullable && this.random.realZeroToOneExclusive() <= 0.1) row[column.name] = null;
                }
                rows.push(row);
                currentTableRow++;
            }
            insertedRows = await this.dbConnector.insert(table.name, rows);
            currentNbRows += insertedRows;
            if (previousRunRows === currentNbRows) {
                this.logger.warn(`Last run didn't insert any new rows in ${table.name}`);
                break TABLE_LOOP;
            }
            this.logger.info(currentNbRows + ' / ' + maxLines);
            if (this.continue) {
                this.continue = false;
                break TABLE_LOOP;
            }
        }
        return insertedRows;
    }

    private async after(table: CustomizedTable) {
        if (!table.after) return;

        for (const query of table.after) {
            await this.dbConnector.executeRawQuery(query);
        }
    }
}