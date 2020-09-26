import { databaseEngines } from './database-engines';

export class CustomizedSchema {
    public settings: {
        beforeAll: string[],
        afterAll: string[],
        engine: DatabaseEngine,
        disableTriggers: boolean,
        values: { [key: string]: any; };
        seed?: number;
    } = {
            beforeAll: [],
            afterAll: [],
            engine: databaseEngines.MARIADB,
            disableTriggers: false,
            values: {}
        };
    public tables: CustomizedTable[] = [];
}

export class CustomizedTable {
    name: string = '';
    columns: Column[] = [];
    referencedTables: string[] = [];
    before: string[] = [];
    after: string[] = [];
    maxLines: number = 1000;
    addLines: number = Infinity;
    disableTriggers: boolean = false;
}