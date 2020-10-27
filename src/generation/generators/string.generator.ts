import { AbstractGenerator } from './generators';

export class StringGenerator extends AbstractGenerator<string> {
    validate() {
        if (this.column.min === undefined) throw new Error(`min value required for type string: ${this.table.name}.${this.column.name}`);
        if (this.column.max === undefined) throw new Error(`max value required for type string: ${this.table.name}.${this.column.name}`);
        return true;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        if (this.column.max >= 36 && this.column.unique) {
            return this.random.uuid4();
        } else {
            return this.random.string(this.random.integer(this.column.min, this.column.max));
        }
    }
}