import { Table } from '../table-descriptor.interface';
import { Logger } from 'log4js';
import { databaseEngines } from '../database-engines';
import { ColumnOptions } from '../column';
import { Schema } from '../schema.interface';
import { DatabaseConnector } from '../database/database-connector-builder';

export interface CustomSchema {
    settings: {
        engine: databaseEngines;
        disableTriggers: boolean;
        ignoredTables: string[];
        tablesToFill: string[];
        values: { [key: string]: any[]; };
        options: Array<
            {
                dataTypes: string[],
                options: ColumnOptions;
            }
        >;
        seed?: number;
    };
    tables: Table[],
}

export const dummyCustomSchema: CustomSchema = {
    settings: {
        engine: databaseEngines.MARIADB,
        disableTriggers: false,
        ignoredTables: [],
        tablesToFill: [],
        options: [],
        values: {}
    },
    tables: [],
};

export default class Customizer {
    constructor(
        private customSchema: CustomSchema,
        private dbConnector: DatabaseConnector,
        private logger: Logger
    ) { }

    public async customize(schema: Schema): Promise<CustomSchema> {
        let tables = schema.tables
            .filter((table) => {
                return !this.customSchema.settings.ignoredTables.includes(table.name)
                    && (
                        this.customSchema.settings.tablesToFill.length === 0
                        || this.customSchema.settings.tablesToFill.includes(table.name)
                    )
            });

        tables = await Promise.all(tables.map(async (table) => {
            await this.customizeTable(table);
            await this.extractForeignKeys(table);
            return table;
        }));
        this.customSchema.tables = this.orderTablesByForeignKeys(tables)
        return this.customSchema;
    }

    private customizeTable(table: Table): void {
        /** @todo: Remove deprecated warning */
        let useDeprecatedLines = false;
        this.customSchema.tables.forEach((table) => {
            if (table.lines) {
                useDeprecatedLines = true;
                table.maxLines = table.lines;
            }
        });
        if (useDeprecatedLines) this.logger.warn('DEPRECATED: Table.lines is deprecated, please use table.maxLines instead.');
        /****************/
        const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
        if (customTable) {
            table.maxLines = customTable.maxLines;
            table.addLines = customTable.addLines;
            table.disableTriggers = customTable.disableTriggers;
            table.before = customTable.before;
            table.after = customTable.after;
        }
        table.columns.forEach((column) => {
            const customColumn = customTable?.columns.find(c => c.name.toLowerCase() === column.name.toLowerCase());
            if (customColumn?.foreignKey) column.foreignKey = customColumn.foreignKey;
            if (customColumn?.values) column.values = customColumn.values;
            const globalSetting = this.customSchema.settings.options.find(o => o.dataTypes.includes(column.generator));
            column.options = Object.assign({}, column.options, customColumn?.options, globalSetting?.options);
        });
    }

    private extractForeignKeys = async (table: Table) => {
        const foreignKeys = await this.dbConnector.getForeignKeys(table);
        const customTable: Table = Object.assign({
            name: '',
            columns: [],
            maxLines: 0,
        }, this.customSchema.tables.find(t => t.name.toLowerCase() === table.name.toLowerCase()));
        for (let c = 0; c < table.columns.length; c++) {
            const column = table.columns[c];
            const match = foreignKeys.find((fk) => fk.column.toLowerCase() === column.name.toLowerCase());
            if (match) {
                column.foreignKey = { table: match.foreignTable, column: match.foreignColumn };
                column.options.unique = column.options.unique || match.uniqueIndex;
            }
            const customColumn = customTable.columns.find(cc => cc.name.toLowerCase() === column.name.toLowerCase());
            if (customColumn) {
                column.options = Object.assign({}, column.options, customColumn.options);
                if (customColumn.foreignKey) column.foreignKey = customColumn.foreignKey;
                if (customColumn.values) column.values = customColumn.values;
            }
            if (column.foreignKey) {
                table.referencedTables.push(column.foreignKey.table);
            }
        }
    };

    private orderTablesByForeignKeys(tables: Table[]) {
        let sortedTables: Table[] = [];
        const recursive = (branch: Table[]) => {
            const table = branch[branch.length - 1];
            while (table.referencedTables.length > 0) {
                const tableName = table.referencedTables.pop();
                const referencedTable = tables.find((t) => {
                    return t.name === tableName;
                });
                if (referencedTable) recursive(([] as any).concat(branch, referencedTable));
            };

            if (sortedTables.find((t) => t.name.toLowerCase() === table.name.toLowerCase())) return;
            sortedTables.push({
                name: table.name,
                disableTriggers: table.disableTriggers,
                maxLines: table.maxLines,
                addLines: table.addLines,
                columns: table.columns,
                before: table.before,
                after: table.after,
                referencedTables: []
            } as Table);
            branch.pop();
            return;
        };

        tables.forEach((table) => {
            recursive([table]);
        });
        return sortedTables;
    };
}