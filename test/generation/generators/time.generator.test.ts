import { MersenneTwister19937, Random } from 'random-js';
import { TimeGenerator } from '../../../src/generation/generators/time.generator';
import { Generators } from '../../../src/generation/generators/generators';
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';

const random = new Random(MersenneTwister19937.seed(42));
describe('TimeGenerator', () => {
    it('should generate bits', () => {
        const column: CustomizedColumn = new Builder(CustomizedColumn)
            .set('generator', Generators.time)
            .set('max', 3)
            .build();

        const table: CustomizedTable = new Builder(CustomizedTable)
            .set('columns', [column])
            .build();

        const row = {};

        const generator = new TimeGenerator(random, table, column);
        expect(generator.generate(0, row)).toBe('-391:47:16');
    });
});