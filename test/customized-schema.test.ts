import { CustomSchema } from '../src/schema/custom-schema.class';
import { Schema } from '../src/schema/schema.class';
import { CustomizedSchema } from '../src/schema/customized-schema.class';
import { Generators } from '../src/generation/generators/generators';

describe('CustomizedSchema', () => {
    it('handle missing custom table', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: Generators.integer,
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
    it('overrides options with global settings', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: Generators.integer,
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
            generators: [Generators.integer],
            options: {
                autoIncrement: true,
            }
        });
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns).toHaveLength(1);
        expect(result.tables[0].columns[0].max).toBe(10);
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
                    generator: Generators.integer,
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
    it('overrides column options', async () => {
        const schema = new Schema();
        schema.tables = [{
            name: 'table1',
            referencedTables: [],
            columns: [
                {
                    name: 'column1',
                    generator: Generators.integer,
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