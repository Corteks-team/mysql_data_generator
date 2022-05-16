import { classToPlain, plainToClass, Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested, validateOrReject } from 'class-validator';
import { Generators } from '../generation/generators/generators';

export class Schema {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Table)
    tables: Table[] = [];

    static async fromJSON(json: any): Promise<Schema> {
        const schema = plainToClass(Schema, json);
        try {
            await validateOrReject(schema);
        } catch (errors) {
            throw new Error(errors + 'You should regenerate your schema.');
        }
        return schema;
    }

    toJSON() {
        return classToPlain(this);
    }
}

export class Table {
    @IsString()
    name: string = '';
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Column)
    columns: Column[] = [];
    @IsArray()
    referencedTables: string[] = [];
}

export class ForeignKey {
    @IsString()
    table: string = '';
    @IsString()
    column: string = '';
}

export enum Monotonic {
    ASC = 'ASC',
    DESC = 'DESC',
    NONE = 'NONE',
}

export class Column {
    @IsString()
    name: string = '';
    @IsString()
    generator: Generators = Generators.none;
    @IsNumber()
    nullable: number = 0;
    @IsBoolean()
    unique: boolean = false;
    @IsBoolean()
    autoIncrement: boolean = false;
    @IsBoolean()
    unsigned: boolean = false;
    @IsNumber()
    min: number = 0;
    @IsNumber()
    max: number = 255;
    @IsString()
    @IsOptional()
    minDate?: string;
    @IsString()
    @IsOptional()
    maxDate?: string;
    @ValidateNested()
    @IsOptional()
    foreignKey?: ForeignKey;
    @ValidateNested()
    @IsOptional()
    values?: Values;
    @IsOptional()
    @IsString()
    monotonic: Monotonic = Monotonic.NONE;
    @IsOptional()
    @IsString()
    customFunction?: string;
    @IsOptional()
    @IsString()
    template?: string;
    @IsOptional()
    @IsString()
    locale?: string;
}
