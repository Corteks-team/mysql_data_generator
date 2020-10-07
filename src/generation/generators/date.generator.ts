import { AbstractGenerator } from "./generators";
import { Monotonic } from '../../schema/schema.class';

export class DateGenerator extends AbstractGenerator<Date> {
    protected values: Date[] = [];

    init() {
        if (this.column.monotonic !== undefined) {
            this.monotonic(this.column.monotonic);
        }
    }

    monotonic(order: Monotonic) {
        if (!this.table.maxLines || this.table.maxLines === Infinity) throw new Error(`DateGenerator: Monotonic date require a defined table.maxLines: ${this.table.name}`);

        const dates = new Array(this.table.maxLines)
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
        if (this.values[rowIndex]) return this.values[rowIndex];
        return this.generateRandomDate();
    }
}