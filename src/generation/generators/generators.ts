import { Random } from "random-js";
import { CustomizedColumn, CustomizedTable } from "../../schema/customized-schema.class";

export enum Generators {
    none = 'none',
    bit = 'bit',
    integer = 'integer',
    boolean = 'boolean',
    real = 'real',
    date = 'date',
    time = 'time',
    string = 'string',
}

export abstract class AbstractGenerator<T>{
    constructor(
        protected random: Random,
        protected table: CustomizedTable,
        protected column: CustomizedColumn,
    ) { }

    public abstract init(): AbstractGenerator<T>;

    public abstract generate(rowIndex: number, row: { [key: string]: any; }): T;
}