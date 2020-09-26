import Customizer from '../src/analysis/customizer';
import { databaseEngines } from '../src/database-engines';
import { logger } from './index';

let schema: Schema;
let customSchema: CustomSchema;
describe('Customizer', () => {
    beforeEach(() => {
        schema = {
            tables: []
        };
        customSchema = {
            settings: {
                beforeAll: [],
                afterAll: [],
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
        customSchema.settings.options.push({
            dataTypes: ['int'],
            options: {
                autoIncrement: true,
            } as any
        });
        const customizer = new Customizer(customSchema, logger);
        schema = {
            tables: [{
                name: 'table1',
                referencedTables: [],
                columns: [
                    {
                        name: 'column1',
                        generator: 'int',
                        options: {
                            autoIncrement: false,
                            max: 10,
                            min: 10,
                            nullable: true,
                            unique: true,
                            unsigned: true
                        }
                    }
                ]
            }]
        };
        const result = await customizer.customize(schema);
        expect(result.tables[0].columns).toHaveLength(1);
        expect(result.tables[0].columns[0].options.autoIncrement).toBeTruthy();
    });
    it('overrides table options', async () => {
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
        } as any];
        const customizer = new Customizer(customSchema, logger);
        schema = {
            tables: [{
                name: 'table1',
                referencedTables: [],
                columns: [
                    {
                        name: 'column1',
                        generator: 'int',
                        options: {
                            autoIncrement: false,
                            max: 10,
                            min: 10,
                            nullable: true,
                            unique: true,
                            unsigned: true
                        }
                    }
                ]
            }]
        };
        const result = await customizer.customize(schema);
        expect(result.tables[0].maxLines).toBe(100);
    });
    it('handle missing custom table', async () => {
        const customizer = new Customizer(customSchema, logger);
        schema = {
            tables: [{
                name: 'table1',
                referencedTables: [],
                columns: [
                    {
                        name: 'column1',
                        generator: 'int',
                        options: {
                            autoIncrement: false,
                            max: 10,
                            min: 10,
                            nullable: true,
                            unique: true,
                            unsigned: true
                        }
                    }
                ]
            }]
        };
        const result = await customizer.customize(schema);
        expect(result.tables[0].maxLines).toBe(1000);
    });
    it('overrides column options', async () => {
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'column1',
                    options: {
                        max: 100
                    },
                    foreignKey: [],
                    values: []
                }
            ]
        } as any];
        const customizer = new Customizer(customSchema, logger);
        schema = {
            tables: [{
                name: 'table1',
                referencedTables: [],
                columns: [
                    {
                        name: 'column1',
                        generator: 'int',
                        options: {
                            autoIncrement: false,
                            max: 0,
                            min: 10,
                            nullable: true,
                            unique: true,
                            unsigned: true
                        }
                    }
                ]
            }]
        };
        const result = await customizer.customize(schema);
        expect(result.tables[0].columns[0].options.max).toBe(100);
    });
});