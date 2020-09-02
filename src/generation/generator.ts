import { Random, MersenneTwister19937 } from "random-js";
import { Logger } from 'log4js';

export class Generator {
    private random: Random;

    constructor(
        private dbConnector: DatabaseConnector,
        private schema: CustomSchema,
        private logger: Logger
    ) {
        if (schema.settings.seed) {
            this.random = new Random(MersenneTwister19937.seed(schema.settings.seed));
        } else {
            this.random = new Random(MersenneTwister19937.autoSeed());
        }
    }

    private async empty(table: Table) {
        this.logger.info('empty: ', table.name);
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
                    throw new Error(`${table.name}: Not enough values available for foreign key ${foreignKey.table}.${foreignKey.column}`);
                }
                tableForeignKeyValues[`${column.name}_${foreignKey.table}_${foreignKey.column}`] = values;
            }
        }
    }

    public async fill(table: Table, reset: boolean = false, globalDisableTriggers: boolean = false) {
        if (reset) await this.empty(table);
        this.logger.info('fill: ', table.name);
        let handleTriggers = table.disableTriggers || (table.disableTriggers === undefined && globalDisableTriggers);
        if (handleTriggers) await this.dbConnector.disableTriggers(table.name);
        await this.before(table);
        await this.generateData(table);
        await this.after(table);
        if (handleTriggers) await this.dbConnector.enableTriggers(table.name);
    }

    private async before(table: Table) {
        if (!table.before) return;

        for (const query of table.before) {
            await this.dbConnector.executeRawQuery(query);
        }
    }

    private async generateData(table: Table) {
        const tableForeignKeyValues: { [key: string]: any[]; } = {};

        let previousRunRows: number = -1;

        let currentNbRows: number = await this.dbConnector.countLines(table);
        let maxLines = 0;
        if (table.addLines) {
            maxLines = currentNbRows + table.addLines;
            if (table.maxLines) maxLines = Math.min(maxLines, table.maxLines);
        }
        else if (table.maxLines) maxLines = table.maxLines;
        process.stdout.write(currentNbRows + ' / ' + maxLines);
        batch: while (currentNbRows < maxLines) {
            previousRunRows = currentNbRows;

            const rows = [];
            const runRows = Math.min(1000, maxLines - currentNbRows);

            try {
                await this.getForeignKeyValues(table, tableForeignKeyValues, runRows);
            } catch (ex) {
                process.stdout.write('\n')
                this.logger.warn(ex.message);
                break batch;
            }

            for (let i = 0; i < runRows; i++) {
                const row: { [key: string]: any; } = {};
                for (var c = 0; c < table.columns.length; c++) {
                    const column = table.columns[c];
                    if (column.options.autoIncrement) continue;
                    if (column.values) {
                        let parsedValues: ParsedValues = []
                        let values: Values = column.values;
                        if (typeof values === 'string') {
                            values = this.schema.settings.values[values] as ParsedValues | ValuesWithRatio;
                        }
                        if (!(values instanceof Array)) {
                            Object.keys(values).forEach((key: string) => {
                                let arr = new Array(Math.round((values as any)[key] * 100));
                                arr = arr.fill(key);
                                parsedValues = parsedValues.concat(arr);
                            });
                        } else {
                            parsedValues = values
                        }
                        row[column.name] = this.random.pick(parsedValues);
                        continue;
                    }
                    if (column.foreignKey) {
                        const foreignKeys = tableForeignKeyValues[`${column.name}_${column.foreignKey.table}_${column.foreignKey.column}`];
                        row[column.name] = foreignKeys[i];
                        continue;
                    }
                    switch (column.generator) {
                        case 'set':
                        case 'bit':
                            row[column.name] = this.random.integer(0, Math.pow(2, column.options.max));
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
                            row[column.name] = this.random.integer(column.options.min, column.options.max);
                            break;
                        case 'decimal':
                        case 'dec':
                        case 'float':
                        case 'double':
                            row[column.name] = this.random.real(column.options.min, column.options.max);
                            break;
                        case 'date':
                        case 'datetime':
                        case 'timestamp':
                            const min = column.options.min ? new Date(column.options.min) : new Date('01-01-1970');
                            const max = column.options.max ? new Date(column.options.max) : new Date();
                            row[column.name] = this.random.date(min, max);
                            break;
                        case 'time':
                            const hours = this.random.integer(-838, +838);
                            const minutes = this.random.integer(-0, +59);
                            const seconds = this.random.integer(-0, +59);
                            row[column.name] = `${hours}:${minutes}:${seconds}`;
                            break;
                        case 'year':
                            row[column.name] = this.random.integer(column.options.min, column.options.max);
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
                            if (column.options.max >= 36 && column.options.unique) {
                                row[column.name] = this.random.uuid4();
                            } else {
                                row[column.name] = this.random.string(this.random.integer(column.options.min, column.options.max));
                            }
                            break;
                        case 'enum':
                            row[column.name] = Math.floor(this.random.realZeroToOneExclusive() * (column.options.max)) + 1;
                            break;
                    }
                    if (column.options.nullable && this.random.realZeroToOneExclusive() <= 0.1) row[column.name] = null;
                }
                rows.push(row);
            }
            currentNbRows += await this.dbConnector.insert(table.name, rows);
            if (previousRunRows === currentNbRows) {
                process.stdout.write('\n')
                this.logger.warn(`Last run didn't insert any new rows in ${table.name}`);
                break batch;
            }
            process.stdout.clearLine(-1);  // clear current text
            process.stdout.cursorTo(0);
            process.stdout.write(currentNbRows + ' / ' + maxLines);
        }
        process.stdout.write('\n')
    }

    private async after(table: Table) {
        if (!table.after) return;

        for (const query of table.after) {
            await this.dbConnector.executeRawQuery(query);
        }
    }
}