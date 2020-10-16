import { Random, MersenneTwister19937 } from 'random-js';
import { Logger } from 'log4js';
import { CustomizedSchema, CustomizedTable } from '../schema/customized-schema.class';
import { Table } from '../schema/schema.class';
import { DatabaseConnector } from '../database/database-connector-builder';
import { AbstractGenerator, Generators } from './generators/generators';
import { BitGenerator, BooleanGenerator, DateGenerator, IntegerGenerator, RealGenerator, StringGenerator, TimeGenerator, ValuesGenerator } from './generators';

export class Filler {
    private random: Random;
    private continue: boolean = false;

    constructor(
        private dbConnector: DatabaseConnector,
        private schema: CustomizedSchema,
        private logger: Logger,
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

    public async fillTables(reset: boolean = false) {
        await this.beforeAll();
        for (const table of this.schema.tables) {
            await this.fill(table, reset);
        }
        await this.afterAll();
    }

    private async fill(table: CustomizedTable, reset: boolean = false) {
        if (reset) await this.empty(table);
        this.logger.info('fill: ', table.name);
        const handleTriggers = table.disableTriggers || (table.disableTriggers === undefined && this.schema.settings.disableTriggers);
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
        let previousRunRows: number = -1;

        let currentNbRows: number = await this.dbConnector.countLines(table);
        let maxLines = 0;
        if (table.addLines !== undefined) {
            maxLines = currentNbRows + table.addLines;
            if (table.maxLines !== undefined) maxLines = Math.min(maxLines, table.maxLines);
        }
        else if (table.maxLines !== undefined) maxLines = table.maxLines;
        let insertedRows = 0;

        table.deltaRows = maxLines - currentNbRows;
        if (table.deltaRows <= 0) return 0;

        let currentTableRow = 0;
        this.logger.info(currentNbRows + ' / ' + maxLines);

        const generators: AbstractGenerator<any>[] = [];
        for (const column of table.columns) {
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
                case Generators.values:
                    generators.push(new ValuesGenerator(this.random, table, column));
                    break;
                default:
                case Generators.none:
                    throw new Error(`No generator defined for column: ${table.name}.${column.name}`);
            }
        }

        await Promise.all(generators.map((g) => g.init()));

        TABLE_LOOP: while (currentNbRows < maxLines) {
            previousRunRows = currentNbRows;

            const rows = [];
            const runRows = Math.min(this.schema.settings.maxRowsPerBatch, maxLines - currentNbRows);

            BATCH_LOOP: for (let currentBatchRow = 0; currentBatchRow < runRows; currentBatchRow++) {
                const row: { [key: string]: any; } = {};
                for (let c = 0; c < table.columns.length; c++) {
                    const column = table.columns[c];
                    if (column.autoIncrement) continue;

                    try {
                        row[column.name] = generators[c].generate(currentTableRow, row);
                    } catch (ex) {
                        this.logger.error(ex);
                        break BATCH_LOOP;
                    }

                    if (column.nullable > 0 && this.random.real(0, 1) < column.nullable) row[column.name] = null;
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