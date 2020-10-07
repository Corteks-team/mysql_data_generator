import { AbstractGenerator } from "./generators";

export class DateGenerator extends AbstractGenerator<Date> {
    protected values: Date[] = []

    init() {
        if (this.column.ascending) {
            this.values = new Array(this.table.maxLines)
                .fill(true)
                .map(() => this.generateRandomDate())
                .sort((a, b) => a.getTime() - b.getTime())
        }
        return this;
    }

    generateRandomDate() {
        const min = this.column.minDate ? new Date(this.column.minDate) : new Date('01-01-1970');
        const max = this.column.maxDate ? new Date(this.column.maxDate) : new Date();
        return this.random.date(min, max);
    }

    generate(rowIndex: number, row: { [key: string]: any; }): Date {
        if (this.values[rowIndex]) return this.values[rowIndex]
        return this.generateRandomDate()
    }
}