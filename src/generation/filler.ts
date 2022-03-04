import { MersenneTwister19937, Random } from 'random-js';
import { DatabaseConnector } from '../database/database-connector-builder';
import { CustomizedSchema, CustomizedTable } from '../schema/customized-schema.class';
import { Table } from '../schema/schema.class';
import { GeneratorBuilder } from './generators';
import { AbstractGenerator } from './generators/generators';

export interface ProgressEvent {
    step: string;
    currentTable: string;
    currentValue: number;
    max: number;
    state: 'RUNNING' | 'DONE';
    comment?: string;
}

export class Filler {
    private random: Random;
    private continue: boolean = false;

    constructor(
        private dbConnector: DatabaseConnector,
        private schema: CustomizedSchema,
        private callback: (event: ProgressEvent) => void = () => null,
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
        this.callback({ currentTable: table.name, step: 'empty', state: 'RUNNING', currentValue: 0, max: 1 });
        await this.dbConnector.emptyTable(table);
        this.callback({ currentTable: table.name, step: 'empty', state: 'DONE', currentValue: 1, max: 1 });
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
        const handleTriggers = table.disableTriggers || (table.disableTriggers === undefined && this.schema.settings.disableTriggers);
        if (handleTriggers) await this.dbConnector.disableTriggers(table.name);
        await this.before(table);
        const insertedRows = await this.generateData(table);
        if (insertedRows) await this.after(table);
        if (handleTriggers) await this.dbConnector.enableTriggers(table.name);
    }

    private async beforeAll() {
        if (this.schema.settings.beforeAll.length === 0) return;

        for (let i = 0; i < this.schema.settings.beforeAll.length; i++) {
            this.callback({ currentTable: '', step: 'beforeAll', state: 'RUNNING', currentValue: i, max: this.schema.settings.beforeAll.length });
            await this.dbConnector.executeRawQuery(this.schema.settings.beforeAll[i]);
        }
        this.callback({ currentTable: '', step: 'beforeAll', state: 'DONE', currentValue: this.schema.settings.beforeAll.length, max: this.schema.settings.beforeAll.length });
    }

    private async afterAll() {
        if (this.schema.settings.afterAll.length === 0) return;

        for (let i = 0; i < this.schema.settings.afterAll.length; i++) {
            this.callback({ currentTable: '', step: 'afterAll', state: 'RUNNING', currentValue: i, max: this.schema.settings.afterAll.length });
            await this.dbConnector.executeRawQuery(this.schema.settings.afterAll[i]);
        }
        this.callback({ currentTable: '', step: 'afterAll', state: 'DONE', currentValue: this.schema.settings.afterAll.length, max: this.schema.settings.afterAll.length });
    }

    private async before(table: CustomizedTable) {
        if (table.before.length === 0) return;

        for (let i = 0; i < table.before.length; i++) {
            this.callback({ currentTable: table.name, state: 'RUNNING', step: 'before', currentValue: i, max: table.before.length });
            await this.dbConnector.executeRawQuery(table.before[i]);
        }
        this.callback({ currentTable: table.name, step: 'before', state: 'DONE', currentValue: table.after.length, max: table.after.length });
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

        const generatorBuilder = new GeneratorBuilder(this.random, this.dbConnector, table);
        const generators: AbstractGenerator<any>[] = await Promise.all(table.columns
            .map((column) => generatorBuilder.build(column))
            .map((g) => g.init()));

        this.callback({ currentTable: table.name, step: 'generateData', state: 'RUNNING', currentValue: currentNbRows, max: maxLines });
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
                        this.callback({ currentTable: table.name, step: 'generateData', state: 'RUNNING', currentValue: currentNbRows, max: maxLines, comment: (ex as Error).message });
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
                this.callback({ currentTable: table.name, step: 'generateData', state: 'DONE', currentValue: currentNbRows, max: maxLines, comment: 'Last run did not insert any rows' });
                break TABLE_LOOP;
            }
            this.callback({ currentTable: table.name, step: 'generateData', state: 'RUNNING', currentValue: currentNbRows, max: maxLines });
            if (this.continue) {
                this.continue = false;
                break TABLE_LOOP;
            }
        }
        this.callback({ currentTable: table.name, step: 'generateData', state: 'DONE', currentValue: currentNbRows, max: maxLines });
        return insertedRows;
    }

    private async after(table: CustomizedTable) {
        if (table.after.length === 0) return;

        for (let i = 0; i < table.after.length; i++) {
            this.callback({ currentTable: table.name, step: 'after', state: 'RUNNING', currentValue: i, max: table.after.length });
            await this.dbConnector.executeRawQuery(table.after[i]);
        }
        this.callback({ currentTable: table.name, step: 'after', state: 'DONE', currentValue: table.after.length, max: table.after.length });
    }
}