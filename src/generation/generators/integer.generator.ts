import { AbstractGenerator } from './generators';

export class IntegerGenerator extends AbstractGenerator<number> {
    validate() {
        if (this.column.min === undefined) throw new Error(`min value required for type integer: ${this.table.name}.${this.column.name}`);
        if (this.column.max === undefined) throw new Error(`max value required for type integer: ${this.table.name}.${this.column.name}`);
        return true;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.integer(this.column.min, this.column.max);
    }
}