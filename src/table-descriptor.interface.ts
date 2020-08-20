import { Column } from './column';

type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
    Pick<T, Exclude<keyof T, Keys>>
    & {
        [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys];

interface BaseTable {
    name: string;
    /** @deprecated: This parameter has been renamed maxLines */
    lines?: number;
    columns: Column[];
    before?: string[];
    after?: string[];
    maxLines?: number;
    addLines?: number;
    referencedTables: string[];
}

export type Table = RequireAtLeastOne<BaseTable, 'maxLines' | 'addLines'>;