import { Analyser } from '../src/analysis/analyser';
import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';
import Customizer from '../src/analysis/customizer';
import { Table } from '../src/table-descriptor.interface';
import { logger } from './index';
let testConnector: TestConnector;
let dummySchema: Schema;
let testCustomizer: Customizer;
describe('Analyser', () => {
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
        testCustomizer = new Customizer(dummySchema, logger);
        jest.spyOn(testCustomizer, 'customizeTable').mockImplementation((table: Table) => table);
    });
    it('handle deprecated parameter lines', async () => {
        dummySchema.tables = [{
            name: 'table1',
            lines: 100,
            addLines: 0,
            columns: [],
            before: undefined,
            after: undefined,
            referencedTables: []
        }];
        const analyser = new Analyser(testConnector, dummySchema, testCustomizer, logger);

        expect(dummySchema.tables[0].maxLines).toEqual(100);
    });
    it('analyse all tables if nothing specified', async () => {
        const analyser = new Analyser(testConnector, dummySchema, testCustomizer, logger);

        testConnector.getTablesInformation = jest.fn(async (tablesToFill, ignoredTables) => [{
            name: 'table1',
            lines: 0,
            referencedTables: []
        }]);

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalledWith(dummySchema.settings.ignoredTables, dummySchema.settings.tablesToFill);
        expect(json.tables).toHaveLength(1);
    });
    it('analyse only tablesToFill', async () => {
        dummySchema.settings.tablesToFill = ['table1'];
        const analyser = new Analyser(testConnector, dummySchema, testCustomizer, logger);

        testConnector.getTablesInformation = jest.fn(async (tablesToFill, ignoredTables) => [{
            name: 'table1',
            lines: 0,
            referencedTables: []
        }]);

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalledWith(dummySchema.settings.ignoredTables, dummySchema.settings.tablesToFill);
        expect(json.settings.tablesToFill).toHaveLength(1);
        expect(json.settings.tablesToFill[0]).toBe('table1');
    });

});
