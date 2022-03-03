import { AbstractGenerator } from './generators';

export class TimeGenerator extends AbstractGenerator<string> {
    generate(rowIndex: number, row: { [key: string]: any; }) {
        const hours = this.random.integer(-838, +838);
        const minutes = this.random.integer(-0, +59);
        const seconds = this.random.integer(-0, +59);
        return `${hours}:${minutes}:${seconds}`;
    }
}