import { Random } from 'random-js';
import { CustomizedTable, CustomizedColumn } from '../../schema/customized-schema.class';
import { Generators, AbstractGenerator } from './generators';

import { BitGenerator } from './bit.generator';
import { BooleanGenerator } from './boolean.generator';
import { DateGenerator } from './date.generator';
import { IntegerGenerator } from './integer.generator';
import { RealGenerator } from './real.generator';
import { StringGenerator } from './string.generator';
import { TimeGenerator } from './time.generator';
import { ValuesGenerator } from './values.generator';
import { ForeignKeyGenerator } from './foreignkey.generator';
import { DatabaseConnector } from '../../database/database-connector-builder';

export class GeneratorBuilder {
    constructor(
        private random: Random,
        private dbConnector: DatabaseConnector,
        private table: CustomizedTable,
    ) {

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
            default:
            case Generators.none:
                throw new Error(`No generator defined for column: ${this.table.name}.${column.name}`);
        }
        return generator;
    }


}