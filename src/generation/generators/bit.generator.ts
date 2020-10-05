import { AbstractGenerator } from "./generators";

export class BitGenerator extends AbstractGenerator<number> {
    public init(): AbstractGenerator<number> {
        throw new Error("Method not implemented.");
    }
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.integer(0, Math.pow(2, this.column.max));
    }
}