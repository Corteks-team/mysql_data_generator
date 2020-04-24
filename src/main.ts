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
        const customSchema: CustomSchema = readJSONSync('./custom_schema.json');

        /*customSchema.tables.forEach((table) => {
            if (!table.columns) return;
            table.columns.forEach((column) => {
                if (column.options && (column.options as any).values) {
                    column.values = (column.options as any).values;
                    delete (column.options as any).values;
                    if (Object.keys(column.options).length === 0) delete column.options;
                }

            });
        });
        writeJSONSync('./custom_schema.json', customSchema);
        process.exit();*/


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

    const schema: Schema = readJSONSync('./schema.json');

    const tableService = new TableService(dbConnection, schema.maxCharLength || 255, schema.values);
    for (const table of schema.tables) {
        if (table.lines > 0) {
            if (argv.reset) await tableService.empty(table);
            await tableService.fill(table);
        }
    }
}

main()
    .then(() => {
        if (dbConnection) {
            return dbConnection.destroy();
        }
    });
