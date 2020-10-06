import { AbstractGenerator } from "./generators";

export class RealGenerator extends AbstractGenerator<number> {
    public init(): AbstractGenerator<number> {
        throw new Error("Method not implemented.");
    }
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.real(this.column.min, this.column.max);
    }
}