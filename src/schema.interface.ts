import { TableDescriptor } from './table-descriptor.interface';

export interface Schema {
    maxCharLength: number;
    minDate: string;
    ignoredTables: string[];
    tablesToFill: string[];
    tables: TableDescriptor[];
    values: { [key: string]: any[]; };
}