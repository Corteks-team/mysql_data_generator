import { Builder } from '../../src/builder';
import { Generators } from '../../src/generation/generators/generators';
import { CustomSchema } from '../../src/schema/custom-schema.class';
import { CustomizedSchema } from '../../src/schema/customized-schema.class';
import { Column, Schema, Table } from '../../src/schema/schema.class';

describe('CustomizedSchema', () => {
    it('handle missing custom table', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.string)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const result = CustomizedSchema.create(schema);
        expect(result.tables[0].maxLines).toBe(1000);
    });
    it('overrides options with global settings', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.integer)
            .set('max', 10)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.settings.options.push({
            generators: [Generators.integer],
            options: {
                autoIncrement: true,
            },
        });
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns).toHaveLength(1);
        expect(result.tables[0].columns[0].max).toBe(10);
        expect(result.tables[0].columns[0].autoIncrement).toBeTruthy();
    });
    it('overrides table options', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.string)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].maxLines).toBe(100);
    });
    it('overrides column options', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.string)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'column1',
                    max: 10,
                    values: [],
                },
            ],
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns[0].max).toBe(10);
    });
    it('Column options takes in account default maxLengthValue', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.string)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'column1',
                    max: 100,
                    values: [],
                },
            ],
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns[0].max).toBe(36);
    });
    it('Column options do not override maxLengthValue', async () => {
        const column = new Builder(Column)
            .set('name', 'column1')
            .set('generator', Generators.string)
            .build();

        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', [
                column,
            ])
            .build();

        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.settings.maxLengthValue = 42;
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                {
                    name: 'column1',
                    max: 100,
                    values: [],
                },
            ],
        }];
        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns[0].max).toBe(42);
    });
    it('reorder columns', async () => {
        const columns = [
            new Builder(Column)
                .set('name', 'column1')
                .set('generator', Generators.string)
                .build(),
            new Builder(Column)
                .set('name', 'column2')
                .set('generator', Generators.string)
                .build(),
            new Builder(Column)
                .set('name', 'column3')
                .set('generator', Generators.string)
                .build(),
        ];
        const table = new Builder(Table)
            .set('name', 'table1')
            .set('columns', columns)
            .build();
        const schema = new Schema();
        schema.tables = [table];

        const customSchema = new CustomSchema();
        customSchema.tables = [{
            name: 'table1',
            maxLines: 100,
            columns: [
                { name: 'column2' },
                { name: 'column1' },
            ],
        }];

        const result = CustomizedSchema.create(schema, customSchema);
        expect(result.tables[0].columns[0].name).toBe('column3');
        expect(result.tables[0].columns[1].name).toBe('column2');
        expect(result.tables[0].columns[2].name).toBe('column1');
    });
});