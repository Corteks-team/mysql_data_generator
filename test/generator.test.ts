import { TestConnector } from './test-connector';
import { databaseEngines } from '../src/database-engines';
import { Generator } from '../src/generation/generator';
import { logger } from './index';

let testConnector: TestConnector;
let dummySchema: CustomSchema;
describe('Generator', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
        dummySchema = {
            settings: {
                beforeAll: [],
                afterAll: [],
                engine: databaseEngines.MARIADB,
                disableTriggers: false,
                ignoredTables: [],
                tablesToFill: [],
                values: {},
                options: [],
            },
            tables: [],
        };
    });
    it('should empty table', async () => {
        dummySchema.tables = [{
            name: 'test'
        } as Table];

        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );


        await generator.fillTables(true);

        expect(testConnector.emptyTable).toHaveBeenCalled();

    });
    it('launch before script', async () => {
        dummySchema.tables = [{
            name: 'test',
            before: ['query']
        } as Table];

        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');

    });
    it('launch after script', async () => {
        dummySchema.tables = [{
            name: 'test',
            maxLines: 100,
            after: ['query'],
            columns: [],
            disableTriggers: false,
            referencedTables: []
        }];

        testConnector.insert = jest.fn(async (table, rows) => 100);

        const generator = new Generator(
            testConnector,
            dummySchema,
            logger
        );
        await generator.fillTables(true);

        expect(testConnector.executeRawQuery).toHaveBeenCalledWith('query');
    });
});