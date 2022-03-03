import { MersenneTwister19937, Random } from 'random-js';
import { FunctionGenerator } from '../../../src/generation/generators/function.generator';
import { Generators } from '../../../src/generation/generators/generators';
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

const random = new Random(MersenneTwister19937.seed(42));
describe('FunctionGenerator', () => {
    it('should use custom function', () => {
        const column: CustomizedColumn = new Builder(CustomizedColumn)
            .set('generator', Generators.function)
            .set('customFunction', '(rowIndex, row) => { return [rowIndex, row] }')
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const generator = new FunctionGenerator(random, table, column);
        expect(generator.generate(0, row)).toStrictEqual([0, {}]);
    });
});