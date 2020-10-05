import { TestConnector } from '../test-connector';
import { Filler } from '../../src/generation/filler';
import { getLogger } from 'log4js';
import { CustomizedSchema, CustomizedTable } from '../../src/schema/customized-schema.class';

const logger = getLogger();
let testConnector: TestConnector;
describe('Generator', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
    });
    it('should empty table', async () => {
        const customizedSchema = new CustomizedSchema();
        const customizedTable = new CustomizedTable();
        customizedTable.name = 'test';
        customizedTable.addLines = 10;
        customizedSchema.tables.push(customizedTable);

        const filler = new Filler(
            testConnector,
            customizedSchema,
            logger
        );

        await filler.fillTables(true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch before script', async () => {
        const customizedSchema = new CustomizedSchema();
        const customizedTable = new CustomizedTable();
        customizedTable.name = 'test';
        customizedTable.addLines = 10;
        customizedTable.before = ['query'];
        customizedSchema.tables.push(customizedTable);

        const generator = new Filler(
            testConnector,
            customizedSchema,
            logger
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
    it('launch after script', async () => {
        const customizedSchema = new CustomizedSchema();
        const customizedTable = new CustomizedTable();
        customizedTable.name = 'test';
        customizedTable.maxLines = 100;
        customizedTable.after = ['query'];
        customizedSchema.tables.push(customizedTable);

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