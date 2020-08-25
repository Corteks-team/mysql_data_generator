import { Generator } from '../src/generation/generator';
import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { Table } from '../src/table-descriptor.interface';
import { databaseEngines } from '../src/database-engines';
import { logger } from './index';

let testConnector: TestConnector;
let testTableDescriptor: Table;
let testSchema: Schema;
describe('Table', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
        testTableDescriptor = {
            columns: [],
            disableTriggers: false,
            maxLines: 0,
            name: '',
            after: [],
            before: [],
            referencedTables: []
        };
        testSchema = {
            settings: {
                ignoredTables: [],
                disableTriggers: false,
                tablesToFill: [],
                engine: databaseEngines.MARIADB,
                options: [],
                values: {}
            },
            tables: [],
        };
    });
    it('reset flag', async () => {
        const tableService = new Generator(testConnector, testSchema, logger);
        testTableDescriptor.lines = 100;
        testTableDescriptor.name = 'test_table';

        await tableService.fill(testTableDescriptor, false);
        expect(testConnector.emptyTable).not.toHaveBeenCalled();

        await tableService.fill(testTableDescriptor, true);
        expect(testConnector.emptyTable).toHaveBeenCalledTimes(1);
    });
    it('values without ratio', async () => {
        const tableService = new Generator(testConnector, testSchema, logger);
        testTableDescriptor.maxLines = 100;
        testTableDescriptor.columns = [{
            name: 'column_with_values',
            values: [
                'val1',
                'val2'
            ],
            generator: 'char',
            options: {
                max: 16,
                autoIncrement: false,
                min: 0,
                unique: false,
                nullable: false,
                unsigned: false,
            }
        }];

        await tableService.fill(testTableDescriptor, false);

        const generatedRows = testConnector.insert.mock.calls[0][1];
        const val1Occurences = generatedRows.some((row: any) => row.column_with_values === 'val1');
        const val2Occurences = generatedRows.some((row: any) => row.column_with_values === 'val2');
        expect(val1Occurences).toBeTruthy();
        expect(val2Occurences).toBeTruthy();
    });
    it('values with ratio', async () => {
        const tableService = new Generator(testConnector, testSchema, logger);
        testTableDescriptor.name = 'test_table';
        testTableDescriptor.maxLines = 100;
        testTableDescriptor.columns = [{
            name: 'column_with_values',
            values: {
                val1: 10,
                val2: 90
            },
            generator: 'char',
            options: {
                max: 16,
                autoIncrement: false,
                min: 0,
                unique: false,
                nullable: false,
                unsigned: false,
            }
        }];

        await tableService.fill(testTableDescriptor, false);

        const generatedRows = testConnector.insert.mock.calls[0][1];
        const val1Occurences = generatedRows.filter((row: any) => row.column_with_values === 'val1');
        const val2Occurences = generatedRows.filter((row: any) => row.column_with_values === 'val2');
        expect(val1Occurences.length).toBeLessThanOrEqual(20);
        expect(val2Occurences.length).toBeGreaterThanOrEqual(80);
    });
});