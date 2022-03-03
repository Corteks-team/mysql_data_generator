import { AbstractGenerator } from './generators';
import { Monotonic } from '../../schema/schema.class';

export class DateGenerator extends AbstractGenerator<Date> {
    protected values: Date[] = [];

    validate() {
        if (this.column.minDate === undefined) throw new Error(`minDate value required for type date: ${this.table.name}.${this.column.name}`);
        if (this.column.maxDate === undefined) throw new Error(`maxDate value required for type date: ${this.table.name}.${this.column.name}`);
        return true;
    }

    async init() {
        if (this.column.monotonic !== undefined && this.column.monotonic !== Monotonic.NONE) {
            this.monotonic(this.column.monotonic);
        }
        return this;
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