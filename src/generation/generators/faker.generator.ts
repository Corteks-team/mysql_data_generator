import { faker } from '@faker-js/faker';
import { AbstractGenerator } from './generators';

export class FakerGenerator extends AbstractGenerator<string> {
    public validate(): boolean {
        if (this.column.template === undefined)
            throw new Error(`faker template required for type faker: ${this.table.name}.${this.column.name}`);
        return true;
    }

    public generate(rowIndex: number, row: { [key: string]: any; }): string {
        faker.locale = this.column.locale || 'en';
        return faker.fake(this.column.template!);
    }
}