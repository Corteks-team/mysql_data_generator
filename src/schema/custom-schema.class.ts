import { Column } from './schema.class';
import { ValidateNested, IsArray, validateOrReject, IsEnum, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type, plainToClass, classToPlain } from 'class-transformer';
import { DatabaseEngines } from '../database/database-engines';
import { Generators } from '../generation/generators/generators';

export class CustomSettings {
    @IsArray()
    @ValidateNested({ each: true })
    beforeAll: string[] = [];
    @IsArray()
    @ValidateNested({ each: true })
    afterAll: string[] = [];
    @IsEnum(DatabaseEngines)
    engine: DatabaseEngines = DatabaseEngines.MARIADB;
    @IsBoolean()
    disableTriggers: boolean = false;
    @IsArray()
    @ValidateNested({ each: true })
    ignoredTables: string[] = [];
    @IsArray()
    @ValidateNested({ each: true })
    tablesToFill: string[] = [];
    values: { [key: string]: any[]; } = {};
    options: Array<
        {
            generators: Generators[],
            options: Partial<Column>;
        }
    > = [];
    @IsNumber()
    @IsOptional()
    seed?: number;
    @IsNumber()
    maxRowsPerBatch: number = 1000;
}

export class CustomSchema {
    @ValidateNested()
    settings: CustomSettings = new CustomSettings();
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CustomTable)
    tables: CustomTable[] = [];

    static async fromJSON(json: any): Promise<CustomSchema> {
        const customSchema = plainToClass(CustomSchema, json);
        try {
            await validateOrReject(customSchema);
        } catch (errors) {
            throw new Error(errors + 'You should regenerate your schema.');
        }
        return customSchema;
    }

    toJSON() {
        return classToPlain(this);
    }
}

export class CustomTable {
    @IsString()
    name: string = '';
    @IsArray()
    @ValidateNested({ each: true })
    columns?: CustomColumn[] = [];
    @IsNumber()
    lines?: number;
    @IsArray()
    @ValidateNested({ each: true })
    before?: string[];
    @IsArray()
    @ValidateNested({ each: true })
    after?: string[];
    @IsNumber()
    maxLines?: number;
    @IsNumber()
    addLines?: number;
    @IsBoolean()
    disableTriggers?: boolean;
}

type CustomColumn = { name: string; } & Partial<Column>;
