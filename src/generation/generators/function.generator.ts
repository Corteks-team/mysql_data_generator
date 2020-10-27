import { AbstractGenerator } from './generators';

export class FunctionGenerator extends AbstractGenerator<string | number | null> {
    validate() {
        if (this.column.customFunction === undefined) throw new Error(`customFunction value required for type function: ${this.table.name}.${this.column.name}`);
        return true;
    }

    async init() {
        if (!this.column.customFunction) throw new Error(`${this.column.name} has no customFunction`);
        return this;
    }

    generate(rowIndex: number, row: { [key: string]: any; }) {
        return eval(this.column.customFunction!)(rowIndex, row);
    }
}