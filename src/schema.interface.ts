import { Table } from './table-descriptor.interface';
import { databaseEngines } from './database-engines';
import { ColumnOptions } from './column';

export interface Schema {
    settings: {
        engine: databaseEngines;
        disableTriggers: boolean;
        ignoredTables: string[];
        tablesToFill: string[];
        values: { [key: string]: any[]; };
        options: Array<
            {
                dataTypes: string[],
                options: ColumnOptions;
            }
        >;
        seed?: number;
    };
    tables: Table[];
}

