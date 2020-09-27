import { CustomSchema } from '../src/custom-schema.class';
import { Schema } from '../src/schema.class';
import { CustomizedSchema } from '../src/customized-schema.class';

describe('CustomizedSchema', () => {
    it('overrides options with global settings', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: 'int',
                    autoIncrement: false,
                    max: 10,
                    min: 10,
                    nullable: true,
                    unique: true,
                    unsigned: true
                }
            ]
        }];
        const customSchema = new CustomSchema();
        customSchema.settings.options.push({
            dataTypes: ['int'],
            options: {
                autoIncrement: true,
            }
        });
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns).toHaveLength(1);
        expect(result.tables[0].columns[0].autoIncrement).toBeTruthy();
    });
    it('overrides table options', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: 'int',
                    autoIncrement: false,
                    max: 10,
                    min: 10,
                    nullable: true,
                    unique: true,
                    unsigned: true
                }
            ]
        }];
        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].maxLines).toBe(100);
    });
    it('handle missing custom table', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: 'int',
                    autoIncrement: false,
                    max: 10,
                    min: 10,
                    nullable: true,
                    unique: true,
                    unsigned: true
                }
            ]
        }];
        const result = CustomizedSchema.create(schema);
        expect(result.tables[0].maxLines).toBe(1000);
    });
    it('overrides column options', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: 'int',
                    autoIncrement: false,
                    max: 0,
                    min: 10,
                    nullable: true,
                    unique: true,
                    unsigned: true
                }
            ]
        }];
        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'column1',
                    max: 100,
                    values: []
                }
            ]
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns[0].max).toBe(100);
    });
});