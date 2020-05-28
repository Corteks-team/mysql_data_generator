import { TableDescriptor } from './table-descriptor.interface';
import { databaseEngines } from './database-engines';
import { ColumnOptions } from './column';

export interface Schema {
    settings: {
        engine: databaseEngines;
        ignoredTables: string[];
        tablesToFill: string[];
        values: { [key: string]: any[]; };
        options: Array<
            {
                dataTypes: string[],
                options: ColumnOptions;
            }
        >;
    };
    tables: TableDescriptor[];
}

