import { AbstractGenerator } from "./generators";
import { Monotonic } from '../../schema/schema.class';

export class DateGenerator extends AbstractGenerator<Date> {
    protected values: Date[] = [];

    async init() {
        if (this.column.monotonic !== undefined && this.column.monotonic !== Monotonic.NONE) {
            this.monotonic(this.column.monotonic);
        }
    }

    monotonic(order: Monotonic) {
        const dates = new Array(this.table.deltaRows)
            .fill(true)
            .map(() => this.generateRandomDate());
        if (order === Monotonic.ASC) {
            dates.sort((a, b) => a.getTime() - b.getTime());
        } else {
            dates.sort((a, b) => b.getTime() - a.getTime());
        }
        this.values = dates;
    }

    generateRandomDate() {
        const min = this.column.minDate ? new Date(this.column.minDate) : new Date('01-01-1970');
        const max = this.column.maxDate ? new Date(this.column.maxDate) : new Date();
        return this.random.date(min, max);
    }

    generate(rowIndex: number, row: { [key: string]: any; }): Date {
        let result: Date;
        if (this.values[rowIndex]) result = this.values[rowIndex];
        else result = this.generateRandomDate();
        return result;
    }
}