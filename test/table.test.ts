import { Generator } from '../src/generation/generator';
import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { TableDescriptor } from '../src/table-descriptor.interface';

let testConnector: TestConnector;
describe('Table', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
    });
    it('reset flag', async () => {
        const schema: Schema = {
            ignoredTables: [],
            tablesToFill: [],
            maxCharLength: 0,
            minDate: '',
            tables: [],
            values: {}
        };
        const tableService = new Generator(testConnector, schema);
        const table: TableDescriptor = {
            columns: [],
            lines: 0,
            name: 'test_table'
        };

        await tableService.fill(table, false);
        expect(testConnector.emptyTable).not.toHaveBeenCalled();

        await tableService.fill(table, true);
        expect(testConnector.emptyTable).toHaveBeenCalledTimes(1);
    });
    it('values without ratio', async () => {
        const schema: Schema = {
            ignoredTables: [],
            tablesToFill: [],
            maxCharLength: 0,
            minDate: '',
            tables: [],
            values: {}
        };
        const tableService = new Generator(testConnector, schema);
        const table: TableDescriptor = {
            columns: [{
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
            }],
            lines: 100,
            name: 'test_table'
        };

        await tableService.fill(table, false);

        const generatedRows = testConnector.insert.mock.calls[0][1];
        const val1Occurences = generatedRows.some((row: any) => row.column_with_values === 'val1');
        const val2Occurences = generatedRows.some((row: any) => row.column_with_values === 'val2');
        expect(val1Occurences).toBeTruthy();
        expect(val2Occurences).toBeTruthy();
    });
    it('values with ratio', async () => {
        const schema: Schema = {
            ignoredTables: [],
            tablesToFill: [],
            maxCharLength: 0,
            minDate: '',
            tables: [],
            values: {}
        };
        const tableService = new Generator(testConnector, schema);
        const table: TableDescriptor = {
            columns: [{
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
            }],
            lines: 100,
            name: 'test_table'
        };

        await tableService.fill(table, false);

        const generatedRows = testConnector.insert.mock.calls[0][1];
        const val1Occurences = generatedRows.filter((row: any) => row.column_with_values === 'val1');
        const val2Occurences = generatedRows.filter((row: any) => row.column_with_values === 'val2');
        expect(val1Occurences.length).toBeLessThanOrEqual(20);
        expect(val2Occurences.length).toBeGreaterThanOrEqual(80);
    });
});