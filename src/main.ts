import { readJSONSync, writeJSONSync } from 'fs-extra';
import Knex from 'knex';
import * as yargs from 'yargs';
import { Analyser, CustomSchema } from './analyser';
import { Table, TableService } from './table';

process.on('uncaughtException', (ex) => {
    console.error(ex);
});
process.on('unhandledRejection', (ex) => {
    console.error(ex);
});

export interface Schema {
    maxCharLength: number;
    minDate: string;
    tables: Table[];
    values: { [key: string]: any[]; };
}

let dbConnection: Knex | undefined = undefined;

async function main() {
    const argv = yargs.options({
        database: {
            alias: 'db',
            type: 'string',
            demandOption: true,
            description: 'database',
        },
        host: {
            alias: 'h',
            type: 'string',
        },
        user: {
            alias: 'u',
            type: 'string',
            demandOption: true,
        },
        password: {
            alias: 'p',
            type: 'string',
            demandOption: true,
        },
        analyse: {
            alias: 'a',
            type: 'boolean',
        },
        reset: {
            alias: 'r',
            type: 'boolean',
        },
    }).argv;

    let host = '127.0.0.1';
    let port = 3306;
    if (argv.host) {
        let portString: string;
        [host, portString] = argv.host.split(':');
        if (portString) port = parseInt(portString, 10);
    }

    dbConnection = Knex({
        client: 'mysql',
        connection: {
            database: argv.database,
            host,
            port,
            user: argv.user,
            password: argv.password,
            supportBigNumbers: true,
        },
    }).on('query-error', (err) => {
        console.error(err.code, err.name);
    });

    if (argv.analyse) {
        let customSchema: CustomSchema | undefined = undefined;
        try {
            customSchema = readJSONSync('./custom_schema.json');
        } catch (ex) {
            console.warn('Unable to read ./custom_schema.json, this will not take any customization into account.');
        }

        const analyser = new Analyser(
            dbConnection,
            argv.database,
            customSchema,
        );
        await analyser.extractTables();
        await analyser.extractColumns();
        const json = analyser.generateJson();
        writeJSONSync('./schema.json', json, { spaces: 4 });
        return;
    }

    let schema: Schema | undefined = undefined;
    try {
        schema = readJSONSync('./schema.json');
    } catch (ex) {
        console.error('Unable to read from schema.json. Please run with --analyse first.');
    }

    if (!schema) return;
    const tableService = new TableService(dbConnection, schema.maxCharLength || 255, schema.values);
    for (const table of schema.tables) {
        if (table.lines > 0) {
            if (argv.reset) await tableService.empty(table);
            await tableService.before(table);
            await tableService.fill(table);
            await tableService.after(table);
        }
    }
}

main()
    .then(() => {
        if (dbConnection) {
            return dbConnection.destroy();
        }
    });
