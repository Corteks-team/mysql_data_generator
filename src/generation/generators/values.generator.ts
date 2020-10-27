import { AbstractGenerator } from './generators';

export class ValuesGenerator extends AbstractGenerator<string | number | null> {
    validate() {
        if (this.column.values === undefined) throw new Error(`values attribute required for type values: ${this.table.name}.${this.column.name}`);
        return true;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        if (this.column.values) return this.random.pick(this.column.values);
        return null;
    }
}