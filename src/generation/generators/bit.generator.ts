import { CustomizedColumn, CustomizedTable } from '../../schema/customized-schema.class';
import { AbstractGenerator } from './generators';

export class BitGenerator extends AbstractGenerator<number> {
    static validate(table: CustomizedTable, column: CustomizedColumn) {
        if (column.min === undefined) throw new Error(`min value required for type bit: ${table.name}.${column.name}`);
        if (column.max === undefined) throw new Error(`max value required for type bit: ${table.name}.${column.name}`);
        return true;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.integer(this.column.min, Math.pow(2, this.column.max));
    }
}