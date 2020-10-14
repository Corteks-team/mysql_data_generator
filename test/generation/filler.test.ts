import { TestConnector } from '../test-connector';
import { Filler } from '../../src/generation/filler';
import { getLogger } from 'log4js';
import { CustomizedSchema, CustomizedTable } from '../../src/schema/customized-schema.class';
import { Builder } from '../../src/builder';

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
            logger
        );

        await filler.fillTables(true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch before script', async () => {
        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('addLines', 10)
            .set('before', ['query'])
            .build();

        const customizedSchema = new Builder(CustomizedSchema)
            .set('tables', [
                customizedTable
            ])
            .build();

        const generator = new Filler(
            testConnector,
            customizedSchema,
            logger
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
    it('launch after script', async () => {
        const customizedTable = new Builder(CustomizedTable)
            .set('name', 'test')
            .set('maxLines', 100)
            .set('after', ['query'])
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
            logger
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
});