import { Schema } from '../schema.interface';
import { TableDescriptor } from '../table-descriptor.interface';
import { Logger } from 'log4js';

export default class Customizer {
    constructor(
        private customSchema: Schema,
        private logger: Logger
    ) { }

    public customizeTable(table: TableDescriptor): void {
        const customTable = this.customSchema.tables.find(t => t.name && t.name.toLowerCase() === table.name.toLowerCase());
        if (customTable) {
            table.lines = customTable.lines;
            table.before = customTable.before;
            table.after = customTable.after;
        }
        table.columns.forEach((column) => {
            const customColumn = customTable?.columns.find(c => c.name?.toLowerCase() === column.name.toLowerCase());
            if (customColumn?.foreignKey) column.foreignKey = customColumn?.foreignKey;
            if (customColumn?.values) column.values = customColumn?.values;
            const globalSetting = this.customSchema.settings.options.find(o => o.dataTypes.includes(column.generator));
            column.options = Object.assign(column.options, customColumn?.options, globalSetting?.options);
        });
    }
}