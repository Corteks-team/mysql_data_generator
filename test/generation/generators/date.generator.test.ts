import { MersenneTwister19937, Random } from "random-js";
import { DateGenerator } from "../../../src/generation/generators";
import { Generators } from "../../../src/generation/generators/generators";
import { CustomizedTable } from "../../../src/schema/customized-schema.class";
import { Column, Monotonic } from "../../../src/schema/schema.class";

let random = new Random(MersenneTwister19937.seed(42));
describe('DateGenerator', () => {
    beforeAll(() => {

    });
    it('should generate date', () => {
        const table: CustomizedTable = {
            addLines: 10,
            after: [],
            before: [],
            columns: [],
            disableTriggers: false,
            maxLines: 100,
            name: 'test_table',
            referencedTables: []
        };

        const column: Column = {
            autoIncrement: false,
            generator: Generators.date,
            max: 0,
            min: 0,
            name: 'test_date',
            nullable: false,
            unique: false,
            unsigned: false,
            minDate: '1970-01-01',
            maxDate: '2020-01-01'
        };

        const row = {};

        const dateGenerator = new DateGenerator(random, table, column);
        expect(dateGenerator.generate(0, row)).toStrictEqual(new Date('2018-12-17T15:50:11.304Z'));
    });
    it.only('should generate monotonic date', () => {
        const maxLines = 10;
        const table: CustomizedTable = {
            addLines: maxLines,
            after: [],
            before: [],
            columns: [],
            disableTriggers: false,
            maxLines: maxLines,
            name: 'test_table',
            referencedTables: []
        };

        const column: Column = {
            autoIncrement: false,
            generator: Generators.date,
            max: 0,
            min: 0,
            name: 'test_date',
            nullable: false,
            unique: false,
            unsigned: false,
            minDate: '1970-01-01',
            maxDate: '2020-01-01',
            monotonic: Monotonic.ASC
        };

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