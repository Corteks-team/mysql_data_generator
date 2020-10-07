import { AbstractGenerator } from "./generators";

export class StringGenerator extends AbstractGenerator<string> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        if (this.column.max >= 36 && this.column.unique) {
            return this.random.uuid4();
        } else {
            return this.random.string(this.random.integer(this.column.min, this.column.max));
        }
    }
}