import { Column, ForeignKey, Schema, Table } from './schema.class';
import { CustomSchema } from './custom-schema.class';

export class CustomizedSchema extends CustomSchema {
    public tables: CustomizedTable[] = [];

    public static create(schema: Schema, customSchema: CustomSchema = new CustomSchema): CustomizedSchema {
        const customizedSchema = new CustomizedSchema();

        customizedSchema.settings = Object.assign({}, customizedSchema.settings, customSchema.settings);
        let tables = schema.tables
            .filter((table) => {
                return !customSchema.settings.ignoredTables.includes(table.name)
                    && (
                        customSchema.settings.tablesToFill.length === 0
                        || customSchema.settings.tablesToFill.includes(table.name)
                    );
            });

        const customizedTables: CustomizedTable[] = tables.map((table) => {
            const customizedTable = this.customizeTable(table, customSchema);
            return customizedTable;
        });

        customizedSchema.tables = this.orderTablesByForeignKeys(customizedTables);
        return customizedSchema;
    }

    private static customizeTable(table: Table, customSchema: CustomSchema): CustomizedTable {
        let customizedTable: CustomizedTable = new CustomizedTable();
        customizedTable.name = table.name;
        customizedTable.referencedTables = table.referencedTables;
        const customTable = customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
        if (customTable) {
            customizedTable.maxLines = (customTable.maxLines !== undefined ? customTable.maxLines : Infinity);
            customizedTable.addLines = (customTable.addLines !== undefined ? customTable.addLines : Infinity);
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
            const globalSetting = customSchema.settings.options.find(o => o.generators.includes(column.generator));
            column = Object.assign({}, column, globalSetting?.options, customColumn);
            customizedTable.columns.push(column);
        });
        return customizedTable;
    }

    private static orderTablesByForeignKeys(tables: CustomizedTable[]) {
        let sortedTables: CustomizedTable[] = [];
        const recursive = (branch: CustomizedTable[]) => {
            const table = branch[branch.length - 1];
            while (table.referencedTables.length > 0) {
                const tableName = table.referencedTables.pop();
                const referencedTable = tables.find((t) => {
                    return t.name === tableName;
                });
                if (referencedTable) recursive(([] as CustomizedTable[]).concat(branch, referencedTable));
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

export class CustomizedTable {
    name: string = '';
    columns: CustomizedColumn[] = [];
    referencedTables: string[] = [];
    before: string[] = [];
    after: string[] = [];
    maxLines: number = 1000;
    addLines: number = Infinity;
    disableTriggers: boolean = false;
}

export class CustomizedColumn extends Column {
    foreignKey?: CustomizedForeignKey;
}

export class CustomizedForeignKey extends ForeignKey {
    where?: string;
}