import { MersenneTwister19937, Random } from 'random-js';
import { ForeignKeyGenerator } from '../../../src/generation/generators/foreignkey.generator';
import { Generators } from '../../../src/generation/generators/generators';
import { CustomizedTable, CustomizedColumn } from '../../../src/schema/customized-schema.class';
import { Builder } from '../../../src/builder';
import { TestConnector } from '../../test-connector';

const random = new Random(MersenneTwister19937.seed(42));
describe('ForeignKeyGenerator', () => {
    it('should generate values from foreign key', async () => {
        const idColumn: CustomizedColumn = new Builder(CustomizedColumn)
            .set('name', 'id')
            .set('generator', Generators.integer)
            .build();

        const mother: CustomizedTable = new Builder(CustomizedTable)
            .set('name', 'mother')
            .set('columns', [idColumn])
            .build();

        const fkColumn: CustomizedColumn = new Builder(CustomizedColumn)
            .set('name', 'fk')
            .set('generator', Generators.foreignKey)
            .set('foreignKey', {
                table: 'mother',
                column: 'id',
            })
            .build();

        const child: CustomizedTable = new Builder(CustomizedTable)
            .set('name', 'child')
            .set('columns', [fkColumn])
            .build();

        const dbConnector = new TestConnector();
        dbConnector.getValuesForForeignKeys = jest.fn().mockResolvedValue([1, 2, 3]);

        const row = {};

        const generator = new ForeignKeyGenerator(random, child, fkColumn);
        generator.setDbConnector(dbConnector);
        await generator.init();
        expect(generator.generate(0, row)).toBe(3);
    });
});