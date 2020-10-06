import { AbstractGenerator } from "./generators";

export class BooleanGenerator extends AbstractGenerator<boolean> {
    public init(): AbstractGenerator<boolean> {
        throw new Error("Method not implemented.");
    }
    generate(rowIndex: number, row: { [key: string]: any; }) {
        return this.random.bool();
    }
}