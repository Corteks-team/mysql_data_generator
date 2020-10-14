import { MersenneTwister19937, Random } from "random-js";
import { BooleanGenerator } from "../../../src/generation/generators";
import { Generators } from "../../../src/generation/generators/generators";
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

let random = new Random(MersenneTwister19937.seed(42));
describe('BooleanGenerator', () => {
    it('should generate booleans', () => {
        const column: CustomizedColumn = new Builder(CustomizedColumn)
            .set('generator', Generators.boolean)
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const generator = new BooleanGenerator(random, table, column);
        expect(generator.generate(0, row)).toBe(false);
    });
});