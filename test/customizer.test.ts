import Customizer from '../src/analysis/customizer';
import { Schema } from '../src/schema.interface';
import { databaseEngines } from '../src/database-engines';
import { Table } from '../src/table-descriptor.interface';
import { logger } from './index';

let dummySchema: Schema;
describe('Customizer', () => {
    beforeEach(() => {
        dummySchema = {
            settings: {
                engine: databaseEngines.MARIADB,
                disableTriggers: false,
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
        const table: Table = {
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
            maxLines: 100,
        } as any];
        const customizer = new Customizer(dummySchema, logger);
        const table: Table = {
            name: 'table1',
            maxLines: 0,
            columns: []
        } as any;
        customizer.customizeTable(table);
        expect(table.maxLines).toBe(100);
    });
    it('handle missing custom table', async () => {
        const customizer = new Customizer(dummySchema, logger);
        const table: Table = {
            name: 'table1',
            maxLines: 0,
            columns: [{ name: 'test' }]
        } as any;
        customizer.customizeTable(table);
        expect(table.maxLines).toBe(0);
    });
    it('overrides column options', async () => {
        dummySchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'col1',
                    options: {
                        max: 100
                    },
                    foreignKey: [],
                    values: []
                }
            ]
        } as any];
        const customizer = new Customizer(dummySchema, logger);
        const table: Table = {
            name: 'table1',
            maxLines: 0,
            columns: [
                {
                    name: 'col1',
                    options: {
                        max: 0
                    }
                }
            ]
        } as any;
        customizer.customizeTable(table);
        expect(table.columns[0].options.max).toBe(100);
    });
});