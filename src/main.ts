import { getLogger } from 'log4js';
import { CliMain, CliMainClass, CliParameter } from '@corteks/clify';
import { readJSONSync, writeJSONSync } from 'fs-extra';
import { Analyser, dummyCustomSchema } from './analysis/analyser';
import { Generator } from './generation/generator';
import { DatabaseConnectorBuilder, databaseEngine } from './database/database-connector-builder';
import { Schema } from './schema.interface';
import Customizer from './analysis/customizer';

const logger = getLogger();
logger.level = "debug";

@CliMain
class Main extends CliMainClass {
    @CliParameter({ alias: 'db', demandOption: true, description: 'database', })
    private database: string | undefined = undefined;

    @CliParameter({ alias: 'h'})
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
                    logger.warn('Unable to read ./custom_schema.json, this will not take any customization into account.');
                }
                const customizer = new Customizer(customSchema, logger);
                const analyser = new Analyser(
                    dbConnector,
                    customSchema,
                    customizer,
                    logger
                );
                const json = await analyser.analyse();
                writeJSONSync('./schema.json', json, { spaces: 4 });
                return 0;
            };

            let schema: Schema = readJSONSync('./schema.json');
            const tableService = new Generator(dbConnector, schema, logger);
            await dbConnector.backupTriggers(schema.tables.filter(table => table.maxLines || table.addLines).map(table => table.name))
            /** @todo: Remove deprecated warning */
            let useDeprecatedLines = false;
            for (const table of schema.tables) {
                if (table.lines) {
                    useDeprecatedLines = true;
                    table.maxLines = table.lines;
                }
                if (table.maxLines || table.addLines) {
                    await tableService.fill(table, this.reset, schema.settings.disableTriggers);
                }
            }
            if (useDeprecatedLines) console.warn('DEPRECATED: Table.lines is deprecated, please use table.maxLines instead.');
            /****************/
            dbConnector.cleanBackupTriggers()
        } catch (ex) {
            if (ex.code == 'ENOENT') {
                logger.error('Unable to read from schema.json. Please run with --analyse first.');
            } else {
                logger.error(ex);
            }
        } finally {
            logger.info('Close database connection');
            await dbConnector.destroy();
        }
        return 0;
    }
}