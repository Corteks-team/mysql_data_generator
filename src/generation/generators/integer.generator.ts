import { AbstractGenerator } from './generators';

export class IntegerGenerator extends AbstractGenerator<number> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.integer(this.column.min, this.column.max);
    }
}