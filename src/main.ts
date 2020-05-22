import { Option, Cli } from './decorators/yargs';
import { readJSONSync, writeJSONSync } from 'fs-extra';
import Knex from 'knex';

import { Analyser, CustomSchema, Schema } from './analyser';
import { TableService } from './table';

process.on('uncaughtException', (ex) => {
    console.error(ex);
});
process.on('unhandledRejection', (ex) => {
    console.error(ex);
});

@Cli
class Main {
    @Option({ alias: 'db', type: 'string', demandOption: true, description: 'database', })
    private database: string | undefined = undefined;

    @Option({ alias: 'h', type: 'string', })
    private host: string = '127.0.0.1:3306';
    private port: number = 3306;

    @Option({ alias: 'u', type: 'string', demandOption: true, })
    private user: string = 'root';

    @Option({ alias: 'p', type: 'string', demandOption: true, })
    private password: string = 'root';

    @Option({ alias: 'a', type: 'boolean', })
    private analysis: boolean = false;

    @Option({ alias: 'r', type: 'boolean', })
    private reset: boolean = false;

    async run() {
        if (!this.database) throw new Error('Please provide a valide database name');
        const dbConnection = this.getDatabaseConnection();
        try {
            if (this.analysis) {
                let customSchema: CustomSchema | undefined = undefined;
                try {
                    customSchema = readJSONSync('./custom_schema.json');
                } catch (ex) {
                    console.warn('Unable to read ./custom_schema.json, this will not take any customization into account.');
                }
                const analyser = new Analyser(
                    dbConnection,
                    this.database,
                );
                if (customSchema) analyser.setCustomSchema(customSchema);
                const json = await analyser.analyse();
                writeJSONSync('./schema.json', json, { spaces: 4 });
                return;
            };

            let schema: Schema = readJSONSync('./schema.json');
            const tableService = new TableService(dbConnection, schema.maxCharLength || 255, schema.values);
            for (const table of schema.tables) {
                if (table.lines > 0) {
                    if (this.reset) await tableService.empty(table);
                    await tableService.before(table);
                    await tableService.fill(table);
                    await tableService.after(table);
                }
            }
        } catch (ex) {
            if (ex.code == 'ENOENT') {
                console.error('Unable to read from schema.json. Please run with --analyse first.');
            } else {
                console.error(ex);
            }
        } finally {
            dbConnection.destroy();
        }
    }

    getDatabaseConnection(): Knex {
        const [host, portString] = this.host.split(':');
        if (portString) this.port = parseInt(portString, 10);

        const dbConnection = Knex({
            client: 'mysql',
            connection: {
                database: this.database,
                host,
                port: this.port,
                user: this.user,
                password: this.password,
                supportBigNumbers: true,
            },
        }).on('query-error', (err) => {
            console.error(err.code, err.name);
        });
        return dbConnection;
    }
}

const main = new Main();
main.run();