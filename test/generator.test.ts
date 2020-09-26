import { TestConnector } from './test-connector';
import { Generator } from '../src/generation/generator';
import { CustomizedSchema, CustomizedTable } from '../src/customized-schema.class';

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

        const generator = new Generator(
            testConnector,
            customizedSchema
        );

        await generator.fillTables(true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch before script', async () => {
        const customizedSchema = new CustomizedSchema();
        const customizedTable = new CustomizedTable();
        customizedTable.name = 'test';
        customizedTable.addLines = 10;
        customizedTable.before = ['query'];
        customizedSchema.tables.push(customizedTable);

        const generator = new Generator(
            testConnector,
            customizedSchema
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

        const generator = new Generator(
            testConnector,
            customizedSchema
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
});