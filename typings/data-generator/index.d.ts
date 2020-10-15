type ValuePointer = string;
type ParsedValues = Array<string | number>;
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

interface PGColumn {
    table_catalog: string,
    table_schema: string,
    table_name: string,
    column_name: string,
    ordinal_position: number,
    column_default: string,
    is_nullable: 'YES' | 'NO',
    data_type: string,
    character_maximum_length: number,
    character_octet_length: number,
    numeric_precision: number,
    numeric_precision_radix: number,
    numeric_scale: number,
    datetime_precision: number,
    interval_type: null,
    interval_precision: null,
    character_set_catalog: null,
    character_set_schema: null,
    character_set_name: null,
    collation_catalog: null,
    collation_schema: null,
    collation_name: null,
    domain_catalog: null,
    domain_schema: null,
    domain_name: null,
    udt_catalog: string,
    udt_schema: string,
    udt_name: string,
    scope_catalog: null,
    scope_schema: null,
    scope_name: null,
    maximum_cardinality: null,
    dtd_identifier: string,
    is_self_referencing: 'YES' | 'NO',
    is_identity: 'YES' | 'NO',
    identity_generation: null | 'ALWAYS',
    identity_start: string,
    identity_increment: string,
    identity_maximum: string,
    identity_minimum: string,
    identity_cycle: 'YES' | 'NO',
    is_generated: 'NEVER',
    generation_expression: null,
    is_updatable: 'YES' | 'NO';
}

interface PGTrigger {
    trigger_catalog: string,
    trigger_schema: string,
    trigger_name: string,
    event_manipulation: string,
    event_object_catalog: string,
    event_object_schema: string,
    event_object_table: string,
    action_order: string,
    action_condition: string,
    action_statement: string,
    action_orientation: string,
    action_timing: string,
    action_reference_old_table: string,
    action_reference_new_table: string,
    action_reference_old_row: string,
    action_reference_new_row: string,
    created: string,
    sql_mode: string,
    definer: string,
    character_set_client: string,
    collation_connection: string,
    database_collation: string,
}
