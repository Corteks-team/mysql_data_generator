type ValuePointer = string;
type ParsedValues = string[];
type ValuesWithRatio = { [key: string]: number; };
type Values = ValuePointer | ParsedValues | ValuesWithRatio;

type DatabaseEngines = 'MariaDB';

interface MySQLColumn {
    TABLE_CATALOG: string;
    TABLE_SCHEMA: string;
    TABLE_NAME: string;
    COLUMN_NAME: string;
    ORDINAL_POSITION: number;
    COLUMN_DEFAULT: string;
    IS_NULLABLE: string;
    DATA_TYPE: string;
    CHARACTER_MAXIMUM_LENGTH: number;
    CHARACTER_OCTET_LENGTH: number;
    NUMERIC_PRECISION: number;
    NUMERIC_SCALE: number;
    DATETIME_PRECISION: number;
    CHARACTER_SET_NAME: string;
    COLLATION_NAME: string;
    COLUMN_TYPE: string;
    COLUMN_KEY: string;
    EXTRA: string;
    PRIVILEGES: string;
    COLUMN_COMMENT: string;
    FOREIGN_VALUES: any[];
}

interface Trigger {
    TRIGGER_CATALOG: string,
    TRIGGER_SCHEMA: string,
    TRIGGER_NAME: string,
    EVENT_MANIPULATION: string,
    EVENT_OBJECT_CATALOG: string,
    EVENT_OBJECT_SCHEMA: string,
    EVENT_OBJECT_TABLE: string,
    ACTION_ORDER: string,
    ACTION_CONDITION: string,
    ACTION_STATEMENT: string,
    ACTION_ORIENTATION: string,
    ACTION_TIMING: string,
    ACTION_REFERENCE_OLD_TABLE: string,
    ACTION_REFERENCE_NEW_TABLE: string,
    ACTION_REFERENCE_OLD_ROW: string,
    ACTION_REFERENCE_NEW_ROW: string,
    CREATED: string,
    SQL_MODE: string,
    DEFINER: string,
    CHARACTER_SET_CLIENT: string,
    COLLATION_CONNECTION: string,
    DATABASE_COLLATION: string,
}

interface Schema {
    tables: Table[];
}

interface Table {
    name: string;
    columns: Column[];
    referencedTables: string[];
}

interface Column {
    name: string;
    generator: string;
    options: {
        nullable: boolean;
        unique: boolean;
        autoIncrement: boolean;
        unsigned: boolean;
        min: number;
        max: number;
        minDate?: string;
        maxDate?: string | undefined;
    };
    foreignKey?: {
        table: string;
        column: string;
        where?: string;
    };
    values?: Values;
}

interface CustomSchema {
    settings: {
        beforeAll: string[];
        afterAll: string[];
        engine: DatabaseEngines;
        disableTriggers: boolean;
        ignoredTables: string[];
        tablesToFill: string[];
        values: { [key: string]: any[]; };
        options: Array<
            {
                dataTypes: string[],
                options: Partial<Column['options']>;
            }
        >;
        seed?: number;
    };
    tables: CustomTable[],
}

interface ForeignKey {
    column: string,
    foreignTable: string,
    foreignColumn: string;
    uniqueIndex: boolean;
}

interface DatabaseConnector {
    init(): Promise<void>;
    getTablesInformation(): Promise<Table[]>;
    getColumnsInformation(table: Table): Promise<MySQLColumn[]>;
    getForeignKeys(table: Table): Promise<ForeignKey[]>;
    countLines(table: Table): Promise<number>;
    emptyTable(table: Table): Promise<void>;
    getValuesForForeignKeys(table: string, column: string, foreignTable: string, foreignColumn: string, limit: number, unique: boolean, condition: string | undefined): Promise<any[]>;
    executeRawQuery(query: string): Promise<void>;
    insert(table: string, lines: any[]): Promise<number>;
    destroy(): Promise<void>;
    backupTriggers(tables: string[]): Promise<void>;
    cleanBackupTriggers(): void;
    disableTriggers(table: string): Promise<void>;
    enableTriggers(table: string): Promise<void>;
}

type CustomTable = { name: string; } & Partial<Table> & BaseTable;

interface BaseTable {
    name: string;
    /** @deprecated: This parameter has been renamed maxLines */
    lines?: number;
    before?: string[];
    after?: string[];
    maxLines?: number;
    addLines?: number;
    disableTriggers?: boolean;
}