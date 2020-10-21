import { AbstractGenerator } from './generators';

export class FunctionGenerator extends AbstractGenerator<string | number | null> {
    async init() {
        if (!this.column.customFunction) throw new Error(`${this.column.name} has no customFunction`);
        return this;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        return eval(this.column.customFunction!)(rowIndex, row);
    }
}