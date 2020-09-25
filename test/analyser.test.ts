import { Analyser } from '../src/analysis/analyser';
import { TestConnector } from './test-connector';
import { logger } from './index';
let testConnector: TestConnector;
describe('Analyser', () => {
    beforeEach(() => {
        testConnector = new TestConnector();
    });
    it('analyse all tables', async () => {
        const analyser = new Analyser(testConnector, logger);

        testConnector.getTablesInformation = jest.fn(async () => [{
            name: 'table1',
            maxLines: 0,
            referencedTables: []
        }]);

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalled();
        expect(json.tables).toHaveLength(1);
    });
    it('handle all data types', async () => {
        const analyser = new Analyser(testConnector, logger);

        testConnector.getTablesInformation = jest.fn(async (tablesToFill, ignoredTables) => [{
            name: 'table1',
            lines: 0,
            referencedTables: [],
        }]);
        testConnector.getColumnsInformation = jest.fn(async (table): Promise<MySQLColumn[]> => {
            return [
                { COLUMN_NAME: 'enum', DATA_TYPE: 'enum', COLUMN_TYPE: 'enum()', IS_NULLABLE: 'YES' },
                { COLUMN_NAME: 'bit', DATA_TYPE: 'bit' },
                { COLUMN_NAME: 'bool', DATA_TYPE: 'bool' },
                { COLUMN_NAME: 'tinyint', DATA_TYPE: 'tinyint' },
                { COLUMN_NAME: 'tinyint_unsigned', DATA_TYPE: 'tinyint', COLUMN_TYPE: 'unsigned' },
                { COLUMN_NAME: 'smallint', DATA_TYPE: 'smallint' },
                { COLUMN_NAME: 'smallint_unsigned', DATA_TYPE: 'smallint', COLUMN_TYPE: 'unsigned' },
                { COLUMN_NAME: 'mediumint', DATA_TYPE: 'mediumint' },
                { COLUMN_NAME: 'mediumint_unsigned', DATA_TYPE: 'mediumint', COLUMN_TYPE: 'unsigned' },
                { COLUMN_NAME: 'int', DATA_TYPE: 'int', COLUMN_KEY: 'PRI', EXTRA: 'auto_increment' },
                { COLUMN_NAME: 'int_unsigned', DATA_TYPE: 'int', COLUMN_TYPE: 'unsigned' },
                { COLUMN_NAME: 'decimal', DATA_TYPE: 'decimal' },
                { COLUMN_NAME: 'decimal_unsigned', DATA_TYPE: 'decimal', COLUMN_TYPE: 'unsigned' },
                { COLUMN_NAME: 'date', DATA_TYPE: 'date' },
                { COLUMN_NAME: 'time', DATA_TYPE: 'time' },
                { COLUMN_NAME: 'year', DATA_TYPE: 'year' },
                { COLUMN_NAME: 'varchar', DATA_TYPE: 'varchar' },
                { COLUMN_NAME: 'blob', DATA_TYPE: 'blob' }
            ] as any;
        });

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalled();
        expect(json.tables).toHaveLength(1);
    });
    it('handle foreign keys', async () => {

        const analyser = new Analyser(testConnector, logger);

        testConnector.getTablesInformation = jest.fn(async () => [
            {
                name: 'table1',
                lines: 0,
                referencedTables: ['table2'],
            },
            {
                name: 'table2',
                lines: 0,
                referencedTables: [],
            }
        ]);
        testConnector.getColumnsInformation = jest.fn()
            .mockReturnValueOnce([
                {
                    COLUMN_NAME: 'fk'
                }
            ])
            .mockReturnValueOnce([
                {
                    COLUMN_NAME: 'id'
                }
            ]);
        testConnector.getForeignKeys = jest.fn()
            .mockReturnValueOnce([
                {
                    column: 'fk',
                    foreignTable: 'table2',
                    foreignColumn: 'id',
                    uniqueIndex: false
                }
            ])
            .mockReturnValueOnce([]);

        const json = await analyser.analyse();

        expect(testConnector.getTablesInformation).toHaveBeenCalled();
        expect(json.tables).toHaveLength(2);
    });
});
