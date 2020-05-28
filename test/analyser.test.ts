import { Analyser, TableWithForeignKeys } from '../src/analysis/analyser';
import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';

let testConnector: TestConnector;

describe('Analyser', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
    });
    it.only('analyse only tablesToFill', async () => {
        const customSchema: Schema = {
            settings: {
                engine: databaseEngines.MARIADB,
                ignoredTables: [],
                tablesToFill: ['table1'],
                options: [],
                values: {}
            },
            tables: [],
        };
        const analyser = new Analyser(testConnector, customSchema);

        testConnector.getTablesInformation = jest.fn(async (tablesToFill, ignoredTables): Promise<TableWithForeignKeys[]> => [{
            name: 'table1',
            columns: [],
            lines: 0,
            referencedTables: []
        }]);

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalledWith(customSchema.settings.ignoredTables, customSchema.settings.tablesToFill);
        expect(json.settings.tablesToFill).toHaveLength(1);
        expect(json.settings.tablesToFill[0]).toBe('table1');
    });
});
