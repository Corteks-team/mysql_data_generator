import { MersenneTwister19937, Random } from "random-js";
import { DateGenerator } from "../../../src/generation/generators";
import { Generators } from "../../../src/generation/generators/generators";
import { Column, Monotonic } from "../../../src/schema/schema.class";
import { CustomizedTable } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

let random = new Random(MersenneTwister19937.seed(42));
describe('DateGenerator', () => {
    beforeAll(() => {

    });
    it('should generate date', () => {
        const column: Column = new Builder(Column)
            .set('generator', Generators.date)
            .set('minDate', '01-01-1970 00:00:00Z')
            .set('maxDate', '01-01-2020 00:00:00Z')
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const dateGenerator = new DateGenerator(random, table, column);
        expect(dateGenerator.generate(0, row)).toStrictEqual(new Date('2018-12-17T15:50:11.304Z'));
    });
    it('should generate monotonic date', () => {
        const maxLines = 10;

        const column: Column = new Builder(Column)
            .set('generator', Generators.date)
            .set('monotonic', Monotonic.ASC)
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('maxLines', maxLines)
            .set('columns', [column])
            .set('deltaRows', maxLines)
            .build();

        const row = {};

        const dateGenerator = new DateGenerator(random, table, column);
        dateGenerator.init();
        const results: Date[] = new Array(maxLines).fill(true).map((value, index) => (dateGenerator.generate(index, row)));

        expect(results).toHaveLength(maxLines);
        results.forEach((value, index) => {
            if (index >= 1) expect(value.getTime()).toBeGreaterThanOrEqual(results[index - 1].getTime());
        });
    });
});