import { MersenneTwister19937, Random } from "random-js";
import { ValuesGenerator } from "../../../src/generation/generators";
import { Generators } from "../../../src/generation/generators/generators";
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

let random = new Random(MersenneTwister19937.seed(42));
describe('ValuesGenerator', () => {
    it('should generate values', () => {
        const column: CustomizedColumn = new Builder(CustomizedColumn)
            .set('generator', Generators.values)
            .set('values', ['test1', 'test2'])
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const generator = new ValuesGenerator(random, table, column);
        expect(generator.generate(0, row)).toBe('test1');
    });
});