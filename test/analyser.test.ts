import { Analyser } from '../src/analysis/analyser';
import { TestConnector } from './test-connector';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';
import Customizer from '../src/analysis/customizer';
import { Table } from '../src/table-descriptor.interface';
import { logger } from './index';
import { MySQLColumn } from '../src/database/mysql-column';
import { Column } from '../src/column';
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
    it('handle all data types', async () => {
        dummySchema = {
            settings: {
                ignoredTables: []
            },
            tables: [
                {
                    name: 'table1',
                    columns: [
                        { name: 'enum', generator: 'enum', values: ['value1', 'value2'] } as Column,
                    ]
                } as Table
            ]
        } as any as Schema;
        const analyser = new Analyser(testConnector, dummySchema, testCustomizer, logger);

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

        expect(testConnector.getTablesInformation).toHaveBeenCalledWith(dummySchema.settings.ignoredTables, dummySchema.settings.tablesToFill);
        expect(json.tables).toHaveLength(1);
    });
    it('handle foreign keys', async () => {
        dummySchema = {
            settings: {
                engine: databaseEngines.MARIADB,
                ignoredTables: [],
                options: [],
                tablesToFill: [],
                values: {}
            },
            tables: [
                {
                    name: 'table1',
                    addLines: 1,
                    columns: [{
                        name: 'fk',
                        generator: 'int',
                        foreignKey: 'table2.id'
                    }],
                    referencedTables: []
                },
                {
                    name: 'table2',
                    addLines: 1,
                    columns: [],
                    referencedTables: []
                }
            ] as any
        };
        const analyser = new Analyser(testConnector, dummySchema, testCustomizer, logger);

        testConnector.getTablesInformation = jest.fn(async (tablesToFill, ignoredTables) => [
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

        expect(testConnector.getTablesInformation).toHaveBeenCalledWith(dummySchema.settings.ignoredTables, dummySchema.settings.tablesToFill);
        expect(json.tables).toHaveLength(2);
    });
});
