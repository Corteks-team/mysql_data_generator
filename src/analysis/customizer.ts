import { Logger } from 'log4js';
import { CustomizedSchema, CustomizedTable } from '../customized-schema';
import { databaseEngines } from '../database-engines';

export const dummyCustomSchema: CustomSchema = {
    settings: {
        afterAll: [],
        beforeAll: [],
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
        private logger: Logger
    ) { }

    public async customize(schema: Schema): Promise<CustomizedSchema> {
        let customizedSchema = new CustomizedSchema();
        customizedSchema.settings = this.customSchema.settings;
        let tables = schema.tables
            .filter((table) => {
                return !this.customSchema.settings.ignoredTables.includes(table.name)
                    && (
                        this.customSchema.settings.tablesToFill.length === 0
                        || this.customSchema.settings.tablesToFill.includes(table.name)
                    );
            });

        const customizedTables: CustomizedTable[] = tables.map((table) => {
            const customizedTable = this.customizeTable(table);
            return customizedTable;
        });
        customizedSchema.tables = this.orderTablesByForeignKeys(customizedTables);
        return customizedSchema;
    }

    private customizeTable(table: Table): CustomizedTable {
        let customizedTable: CustomizedTable = new CustomizedTable();
        customizedTable.name = table.name;
        customizedTable.referencedTables = table.referencedTables;
        /** @todo: Remove deprecated warning */
        let useDeprecatedLines = false;
        this.customSchema.tables.forEach((table) => {
            if (table.lines) {
                useDeprecatedLines = true;
                customizedTable.maxLines = table.lines;
            }
        });
        if (useDeprecatedLines) this.logger.warn('DEPRECATED: Table.lines is deprecated, please use table.maxLines instead.');
        /****************/
        const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
        if (customTable) {
            customizedTable.maxLines = customTable.maxLines || Infinity;
            customizedTable.addLines = customTable.addLines || Infinity;
            customizedTable.disableTriggers = customTable.disableTriggers || false;
            customizedTable.before = customTable.before || [];
            customizedTable.after = customTable.after || [];
        }
        table.columns.forEach((column) => {
            const customColumn = customTable?.columns?.find(c => c.name.toLowerCase() === column.name.toLowerCase());
            if (customColumn?.foreignKey) {
                column.foreignKey = customColumn.foreignKey;
                customizedTable.referencedTables.push(column.foreignKey.table);
            }
            if (customColumn?.values) column.values = customColumn.values;
            const globalSetting = this.customSchema.settings.options.find(o => o.dataTypes.includes(column.generator));
            column.options = Object.assign({}, column.options, customColumn?.options, globalSetting?.options);
            customizedTable.columns.push(column);
        });
        return customizedTable;
    }

    private orderTablesByForeignKeys(tables: CustomizedTable[]) {
        let sortedTables: CustomizedTable[] = [];
        const recursive = (branch: CustomizedTable[]) => {
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
            });
            branch.pop();
            return;
        };

        tables.forEach((table) => {
            recursive([table]);
        });
        return sortedTables;
    };
}