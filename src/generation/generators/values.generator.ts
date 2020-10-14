import { AbstractGenerator } from "./generators";

export class ValuesGenerator extends AbstractGenerator<string | number | null> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        if (this.column.values) return this.random.pick(this.column.values);
        return null;
    }
}