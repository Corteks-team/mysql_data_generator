import { getLogger } from 'log4js';
import { Builder } from '../../src/builder';
import { Filler } from '../../src/generation/filler';
import { Generators } from '../../src/generation/generators/generators';
import { CustomSettings } from '../../src/schema/custom-schema.class';
import { CustomizedColumn, CustomizedSchema, CustomizedTable } from '../../src/schema/customized-schema.class';
import { TestConnector } from '../test-connector';

const logger = getLogger();
let testConnector: TestConnector;
describe('Generator', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
    });
    it('should empty table', async () => {
        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('addLines', 10)
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('tables', [
                customizedTable
            ])
            .build();

        const filler = new Filler(
            testConnector,
            customizedSchema,
        );

        await filler.fillTables(true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch beforeAll script', async () => {
        const globalSettings = new Builder(CustomSettings)
            .set('beforeAll', ['query beforeAll'])
            .build();

        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('addLines', 10)
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('settings', globalSettings)
            .set('tables', [
                customizedTable
            ])
            .build();

        const generator = new Filler(
            testConnector,
            customizedSchema,
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query beforeAll');
    });
    it('launch afterAll script', async () => {
        const globalSettings = new Builder(CustomSettings)
            .set('afterAll', ['query afterAll'])
            .build();

        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('addLines', 10)
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('settings', globalSettings)
            .set('tables', [
                customizedTable
            ])
            .build();

        const generator = new Filler(
            testConnector,
            customizedSchema,
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query afterAll');
    });
    it('launch before script', async () => {
        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('addLines', 10)
            .set('before', ['query before'])
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('tables', [
                customizedTable
            ])
            .build();

        const generator = new Filler(
            testConnector,
            customizedSchema,
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query before');
    });
    it('launch after script', async () => {
        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('maxLines', 100)
            .set('after', ['query after'])
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('tables', [
                customizedTable
            ])
            .build();

        testConnector.insert = jest.fn(async (table, rows) => 100);

        const generator = new Filler(
            testConnector,
            customizedSchema,
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query after');
    });
    it('should generate always same data with seed', async () => {
        const column = new Builder(CustomizedColumn)
            .set('name', 'col1')
            .set('generator', Generators.string)
            .build();

        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('maxLines', 1)
            .set('columns', [column])
            .build();

        const globalSettings = new Builder(CustomSettings)
            .set('seed', 42)
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('settings', globalSettings)
            .set('tables', [
                customizedTable
            ])
            .build();

        testConnector.insert = jest.fn(async (table, rows) => 1);

        const generator = new Filler(
            testConnector,
            customizedSchema,
        );
        await generator.fillTables(true);

        expect(testConnector.insert).toHaveBeenCalledWith('test', [{
            col1: 'ZCoQh8uM5swkkx0JNxcv0bxRDLb-7uGl5v8RyWA6_P-B7po99U9YR2Z-4cKYguiMrdy7nX5iz0btBU7gR8hUInqJXNdb9f1Pd1C_rz'
        }]);
    });
});