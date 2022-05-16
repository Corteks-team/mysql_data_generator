import { Builder } from '../builder';
import { GeneratorBuilder } from '../generation/generators';
import { Generators } from '../generation/generators/generators';
import { CustomSchema } from './custom-schema.class';
import { Column, ForeignKey, Schema, Table } from './schema.class';

export class CustomizedSchema extends CustomSchema {
    public tables: CustomizedTable[] = [];

    public static create(schema: Schema, customSchema: CustomSchema = new CustomSchema()): CustomizedSchema {
        const customizedSchema = new CustomizedSchema();

        customizedSchema.settings = Object.assign({}, customizedSchema.settings, customSchema.settings);
        const tables = schema.tables
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

    private static parseValues(columnValues: Values, globalValues: { [key: string]: ParsedValues | ValuesWithRatio; }) {
        let parsedValues: ParsedValues = [];
        let values: Values = columnValues;
        if (typeof values === 'string') {
            values = globalValues[values] as ParsedValues | ValuesWithRatio;
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
        if (parsedValues.length === 0) throw new Error(`No values found`);
        return parsedValues;
    }

    private static customizeTable(table: Table, customSchema: CustomSchema): CustomizedTable {
        const customizedTable: CustomizedTable = new CustomizedTable();
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
        customizedTable.columns = table.columns.map((column): CustomizedColumn => {
            const globalSetting = customSchema.settings.options.find(o => o.generators.includes(column.generator));
            let customColumn = customTable?.columns?.find(c => c.name.toLowerCase() === column.name.toLowerCase());
            customColumn = Object.assign({}, column, globalSetting?.options, customColumn);

            const customizedColumnBuilder = new Builder(CustomizedColumn);
            if (customColumn.autoIncrement !== undefined) customizedColumnBuilder.set('autoIncrement', customColumn.autoIncrement);
            if (customColumn.generator !== undefined) customizedColumnBuilder.set('generator', customColumn.generator);
            if (customColumn.max !== undefined) customizedColumnBuilder.set('max', customColumn.max);
            if (customColumn.min !== undefined) customizedColumnBuilder.set('min', customColumn.min);
            if (customColumn.maxDate !== undefined) customizedColumnBuilder.set('maxDate', customColumn.maxDate);
            if (customColumn.minDate !== undefined) customizedColumnBuilder.set('minDate', customColumn.minDate);
            if (customColumn.monotonic !== undefined) customizedColumnBuilder.set('monotonic', customColumn.monotonic);
            if (customColumn.name !== undefined) customizedColumnBuilder.set('name', customColumn.name);
            if (customColumn.nullable !== undefined) customizedColumnBuilder.set('nullable', customColumn.nullable);
            if (customColumn.unique !== undefined) customizedColumnBuilder.set('unique', customColumn.unique);
            if (customColumn.unsigned !== undefined) customizedColumnBuilder.set('unsigned', customColumn.unsigned);
            if (customColumn.customFunction !== undefined) customizedColumnBuilder.set('customFunction', customColumn.customFunction);
            if (customColumn.template !== undefined) customizedColumnBuilder.set('template', customColumn.template);
            if (customColumn?.foreignKey) {
                customizedColumnBuilder.set('foreignKey', customColumn.foreignKey);
                customizedTable.referencedTables.push(customColumn.foreignKey.table);
            }
            if (customColumn.generator === Generators.values) customizedColumnBuilder.set('values', CustomizedSchema.parseValues(customColumn.values || [], customSchema.settings.values));

            if (customColumn.generator === Generators.string) {
                if (customColumn.max !== undefined && customSchema.settings.maxLengthValue !== undefined && customColumn.max > customSchema.settings.maxLengthValue) {
                    customizedColumnBuilder.set('max', customSchema.settings.maxLengthValue);
                }
            }

            const customizedColumn = customizedColumnBuilder.build();
            GeneratorBuilder.validate(customizedTable, customizedColumn);
            return customizedColumn;
        }).sort((c1, c2) => {
            if (!customTable) return 0;
            if (!customTable.columns) return 0;
            const cc1 = customTable.columns.findIndex(c => c.name.toLowerCase() === c1.name.toLowerCase());
            const cc2 = customTable.columns.findIndex(c => c.name.toLowerCase() === c2.name.toLowerCase());

            if (cc1 === -1 && cc2 >= 0) return -1;
            if (cc1 === -1 && cc2 === -1) return 0;
            if (cc1 >= 0 && cc2 === -1) return 1;
            if (cc1 < cc2) return -1;
            return 1;
        });
        return customizedTable;
    }

    private static orderTablesByForeignKeys(tables: CustomizedTable[]) {
        const sortedTables: CustomizedTable[] = [];
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
                deltaRows: table.addLines || table.maxLines,
                columns: table.columns,
                before: table.before,
                after: table.after,
                referencedTables: [],
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
    deltaRows: number = 0;
    disableTriggers: boolean = false;
}

export class CustomizedColumn extends Column {
    foreignKey?: CustomizedForeignKey;
    values?: ParsedValues;
}

export class CustomizedForeignKey extends ForeignKey {
    where?: string;
}