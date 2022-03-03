import { MersenneTwister19937, Random } from 'random-js';
import { RealGenerator } from '../../../src/generation/generators/real.generator';
import { Generators } from '../../../src/generation/generators/generators';
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

const random = new Random(MersenneTwister19937.seed(42));
describe('RealGenerator', () => {
    it('should generate reals', () => {
        const column: CustomizedColumn = new Builder(CustomizedColumn)
            .set('generator', Generators.real)
            .set('max', 10)
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const generator = new RealGenerator(random, table, column);
        expect(generator.generate(0, row)).toBe(0.5815448596142969);
    });
});