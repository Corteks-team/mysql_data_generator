import { AbstractGenerator } from './generators';

export class BooleanGenerator extends AbstractGenerator<boolean> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.bool();
    }
}