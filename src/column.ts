export type Values = string | string[];

export interface Column {
    name: string;
    generator: string;
    options: {
        nullable?: boolean;
        min?: number;
        max?: number;
        unsigned?: boolean;
        autoIncrement?: boolean;
    };
    foreignKey?: {
        table: string;
        column: string;
    };
    values?: Values;
}