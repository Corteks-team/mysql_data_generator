import { CustomSchema } from '../../../src/schema/custom-schema.class';

describe('CustomSchema', () => {
    it('throw if JSON not valide', async () => {
        await expect(() => CustomSchema.fromJSON({ tables: 0 })).rejects.toThrow();
    });
    it('return a CustomSchema from JSON', async () => {
        const schema = await CustomSchema.fromJSON({});
        expect(schema).toBeInstanceOf(CustomSchema);
    });
    it('serialize to JSON', () => {
        const schema = new CustomSchema();
        expect(schema.toJSON().settings).toBeDefined();
        expect(schema.toJSON().tables).toBeDefined();
    });
});