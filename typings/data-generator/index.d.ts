type ValuePointer = string;
type ParsedValues = string[];
type ValuesWithRatio = { [key: string]: number; };
type Values = ValuePointer | ParsedValues | ValuesWithRatio;

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
