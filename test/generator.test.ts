import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';
import { Generator } from '../src/generation/generator';
import { logger } from './index';
import { Table } from '../src/table-descriptor.interface';

let testConnector: TestConnector;
let dummySchema: Schema;
describe('Generator', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
        dummySchema = {
            settings: {
                engine: databaseEngines.MARIADB,
                ignoredTables: [],
                tablesToFill: [],
                options: [],
                values: {}
            },
            tables: [],
        };
    });
    it('should empty table', async () => {
        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );

        const table = { name: 'test' } as Table;
        await generator.fill(table, true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch before script', async () => {
        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );

        const before = ['query'];
        const table: Table = { name: 'test', before } as any;
        await generator.fill(table, true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');

    });
    it('launch after script', async () => {
        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );

        const after = ['query'];
        const table: Table = { name: 'test', after } as any;
        await generator.fill(table, true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
});