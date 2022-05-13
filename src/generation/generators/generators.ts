import { Random } from 'random-js';
import { CustomizedColumn, CustomizedTable } from '../../schema/customized-schema.class';

export enum Generators {
    none = 'none',
    bit = 'bit',
    integer = 'integer',
    boolean = 'boolean',
    real = 'real',
    date = 'date',
    time = 'time',
    string = 'string',
    values = 'values',
    foreignKey = 'foreignKey',
    function = 'function',
    faker = 'faker',
}

export abstract class AbstractGenerator<T>{
    constructor(
        protected random: Random,
        protected table: CustomizedTable,
        protected column: CustomizedColumn,
    ) { }

    public static validate(table: CustomizedTable, column: CustomizedColumn): boolean { return true; };

    public async init(): Promise<AbstractGenerator<T>> { return this; }

    public abstract generate(rowIndex: number, row: { [key: string]: any; }): T;
}