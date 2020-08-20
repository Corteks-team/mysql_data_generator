import Customizer from '../src/analysis/customizer';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';
import { TableDescriptor } from '../src/table-descriptor.interface';
import { logger } from './index';

let dummySchema: Schema;
describe('Customizer', () => {
    beforeEach(() => {
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
    it('overrides options with global settings', async () => {
        dummySchema.settings.options.push({
            dataTypes: ['int'],
            options: {
                autoIncrement: true,
            } as any
        });
        const customizer = new Customizer(dummySchema, logger);
        const table: TableDescriptor = {
            name: 'table1',
            columns: [
                {
                    name: 'column1',
                    generator: 'int',
                    options: {
                        autoIncrement: false,
                    } as any
                }
            ]
        } as any;
        customizer.customizeTable(table);
        expect(table.columns).toHaveLength(1);
        expect(table.columns[0].options.autoIncrement).toBeTruthy();
    });
    it('overrides table options', async () => {
        dummySchema.tables = [{
            name: 'table1',
            lines: 100,
        } as any];
        const customizer = new Customizer(dummySchema, logger);
        const table: TableDescriptor = {
            name: 'table1',
            lines: 0,
            columns: []
        } as any;
        customizer.customizeTable(table);
        expect(table.lines).toBe(100);
    });
});