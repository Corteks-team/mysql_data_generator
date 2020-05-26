import { TableService, Table } from '../src/table';
import { TestConnector } from './test-connector';

describe('Table', () => {
    it('reset flag', async () => {
        const testConnector: TestConnector = new TestConnector();
        const values = {};
        const tableService = new TableService(testConnector, 64, values);
        const table: Table = {
            columns: [],
            lines: 0,
            name: 'test_table',
            after: [],
            before: []
        };

        await tableService.fill(table, false);
        expect(testConnector.emptyTable).not.toHaveBeenCalled();

        await tableService.fill(table, true);
        expect(testConnector.emptyTable).toHaveBeenCalledTimes(1);
    });
});