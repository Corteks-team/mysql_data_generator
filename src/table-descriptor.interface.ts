import { Column } from './column';

export interface TableDescriptor {
    name: string;
    lines: number;
    columns: Column[];
    before?: string[];
    after?: string[];
}