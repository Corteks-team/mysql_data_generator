import { CliMainClass, CliMain, CliParameter } from '@corteks/clify';
import { readJSONSync, writeJSONSync } from 'fs-extra';
import { Analyser, Schema, dummyCustomSchema } from './analyser';
import { TableService } from './table';
import { DatabaseConnectorBuilder, databaseEngine } from './database/database-connector-builder';

@CliMain
class Main extends CliMainClass {
    @CliParameter({ alias: 'db', demandOption: true, description: 'database', })
    private database: string | undefined = undefined;

    @CliParameter()
    private host: string = '127.0.0.1:3306';

    @CliParameter()
    private user: string = 'root';

    @CliParameter()
    private password: string = 'root';

    @CliParameter()
    private analyse: boolean = false;

    @CliParameter()
    private reset: boolean = false;

    async main(): Promise<number> {
        if (!this.database) throw new Error('Please provide a valid database name');
        const [host, port] = this.host.split(':');
        const dbConnectorBuilder = new DatabaseConnectorBuilder(databaseEngine.MariaDB);
        const dbConnector = dbConnectorBuilder
            .setHost(host)
            .setPort(parseInt(port, 10))
            .setDatabase(this.database)
            .setCredentials(this.user, this.password)
            .build();
        try {
            if (this.analyse) {
                let customSchema: Schema = dummyCustomSchema;
                try {
                    customSchema = readJSONSync('./custom_schema.json');
                } catch (ex) {
                    console.warn('Unable to read ./custom_schema.json, this will not take any customization into account.');
                }
                const analyser = new Analyser(
                    dbConnector,
                    customSchema
                );
                const json = await analyser.analyse();
                writeJSONSync('./schema.json', json, { spaces: 4 });
                return 1;
            };

            let schema: Schema = readJSONSync('./schema.json');
            const tableService = new TableService(dbConnector, schema.maxCharLength || 255, schema.values);
            for (const table of schema.tables) {
                if (table.lines > 0) {
                    await tableService.fill(table, this.reset);
                }
            }
        } catch (ex) {
            if (ex.code == 'ENOENT') {
                console.error('Unable to read from schema.json. Please run with --analyse first.');
            } else {
                console.error(ex);
            }
        } finally {
            console.log('Close database connection');
            await dbConnector.destroy();
        }
        return 0;
    }
}