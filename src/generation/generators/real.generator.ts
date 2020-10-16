import { AbstractGenerator } from './generators';

export class RealGenerator extends AbstractGenerator<number> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.real(this.column.min, this.column.max);
    }
}