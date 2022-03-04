import { Random } from 'random-js';
import { DatabaseConnector } from '../../database/database-connector-builder';
import { CustomizedColumn, CustomizedTable } from '../../schema/customized-schema.class';
import { BitGenerator } from './bit.generator';
import { BooleanGenerator } from './boolean.generator';
import { DateGenerator } from './date.generator';
import { ForeignKeyGenerator } from './foreignkey.generator';
import { FunctionGenerator } from './function.generator';
import { AbstractGenerator, Generators } from './generators';
import { IntegerGenerator } from './integer.generator';
import { RealGenerator } from './real.generator';
import { StringGenerator } from './string.generator';
import { TimeGenerator } from './time.generator';
import { ValuesGenerator } from './values.generator';


export class GeneratorBuilder {
    constructor(
        private random: Random,
        private dbConnector: DatabaseConnector,
        private table: CustomizedTable,
    ) {

    }

    static validate(table: CustomizedTable, column: CustomizedColumn): boolean {
        switch (column.generator) {
            case Generators.bit:
                BitGenerator.validate(table, column);
                break;
            case Generators.boolean:
                BooleanGenerator.validate(table, column);
                break;
            case Generators.integer:
                IntegerGenerator.validate(table, column);
                break;
            case Generators.real:
                RealGenerator.validate(table, column);
                break;
            case Generators.date:
                DateGenerator.validate(table, column);
                break;
            case Generators.time:
                TimeGenerator.validate(table, column);
                break;
            case Generators.string:
                StringGenerator.validate(table, column);
                break;
            case Generators.values:
                ValuesGenerator.validate(table, column);
                break;
            case Generators.foreignKey:
                ForeignKeyGenerator.validate(table, column);
                break;
            case Generators.function:
                FunctionGenerator.validate(table, column);
                break;
            case Generators.none:
            default:
                throw new Error(`No generator defined for column: ${table.name}.${column.name}`);
        }
        return true;
    }

    build(
        column: CustomizedColumn,
    ) {
        let generator: AbstractGenerator<any>;
        switch (column.generator) {
            case Generators.bit:
                generator = new BitGenerator(this.random, this.table, column);
                break;
            case Generators.boolean:
                generator = new BooleanGenerator(this.random, this.table, column);
                break;
            case Generators.integer:
                generator = new IntegerGenerator(this.random, this.table, column);
                break;
            case Generators.real:
                generator = new RealGenerator(this.random, this.table, column);
                break;
            case Generators.date:
                generator = new DateGenerator(this.random, this.table, column);
                break;
            case Generators.time:
                generator = new TimeGenerator(this.random, this.table, column);
                break;
            case Generators.string:
                generator = new StringGenerator(this.random, this.table, column);
                break;
            case Generators.values:
                generator = new ValuesGenerator(this.random, this.table, column);
                break;
            case Generators.foreignKey:
                generator = new ForeignKeyGenerator(this.random, this.table, column);
                (generator as ForeignKeyGenerator).setDbConnector(this.dbConnector);
                break;
            case Generators.function:
                generator = new FunctionGenerator(this.random, this.table, column);
                break;
            case Generators.none:
            default:
                throw new Error(`No generator defined for column: ${this.table.name}.${column.name}`);
        }
        return generator;
    }


}