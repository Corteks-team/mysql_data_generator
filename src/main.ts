import { getLogger } from 'log4js';
import { CliMain, CliMainClass, CliParameter, KeyPress } from '@corteks/clify';
import * as fs from 'fs-extra';
import { Analyser } from './analysis/analyser';
import { Generator } from './generation/generator';
import { DatabaseConnectorBuilder } from './database/database-connector-builder';
import Customizer, { dummyCustomSchema } from './analysis/customizer';
import * as path from 'path';
import * as JSONC from 'jsonc-parser';
import { databaseEngines } from './database-engines';

const logger = getLogger();
logger.level = "debug";

@CliMain
class Main extends CliMainClass {
    @CliParameter({ alias: 'db', demandOption: true, description: 'database', })
    private database: string | undefined = undefined;

    @CliParameter({ alias: 'h' })
    private host: string = '127.0.0.1:3306';

    @CliParameter()
    private user: string = 'root';

    @CliParameter()
    private password: string = 'root';

    @CliParameter()
    private analyse: boolean = false;

    @CliParameter()
    private reset: boolean = false;

    private generator: Generator | undefined = undefined;

    async main(): Promise<number> {
        if (!this.database) throw new Error('Please provide a valid database name');
        const [host, port] = this.host.split(':');
        const dbConnectorBuilder = new DatabaseConnectorBuilder(databaseEngines.MARIADB);
        let dbConnector: DatabaseConnector;
        try {
            dbConnector = await dbConnectorBuilder
                .setHost(host)
                .setPort(parseInt(port, 10))
                .setDatabase(this.database)
                .setCredentials(this.user, this.password)
                .build();
        } catch (err) {
            logger.error(err.message);
            return 1;
        }
        if (!fs.pathExistsSync('settings')) {
            fs.mkdirSync('settings');
        }
        try {
            if (this.analyse) {
                const analyser = new Analyser(
                    dbConnector,
                    logger
                );
                const json = await analyser.analyse();
                fs.writeJSONSync(path.join('settings', 'schema.json'), json, { spaces: 4 });
                if (!fs.existsSync(path.join('settings', 'custom_schema.jsonc'))) {
                    let customSchema: CustomSchema = dummyCustomSchema;
                    fs.writeJSONSync(path.join('settings', 'custom_schema.jsonc'), customSchema, { spaces: 4 });
                }
                return 0;
            };

            let schema: Schema = fs.readJSONSync(path.join('settings', 'schema.json'));
            let customSchema: CustomSchema = dummyCustomSchema;
            try {
                customSchema = JSONC.parse(fs.readFileSync(path.join('settings', 'custom_schema.jsonc')).toString());
            } catch (ex) {
                logger.warn('Unable to read ./settings/custom_schema.json, this will not take any customization into account.');
            }
            const customizer = new Customizer(customSchema, logger);
            const customizedSchema = await customizer.customize(schema);
            this.generator = new Generator(dbConnector, customizedSchema, logger);

            await dbConnector.backupTriggers(customSchema.tables.filter(table => table.maxLines || table.addLines).map(table => table.name));
            await this.generator.fillTables(this.reset);
            dbConnector.cleanBackupTriggers();
        } catch (ex) {
            if (ex.code == 'ENOENT') {
                logger.error('Unable to read from ./settings/schema.json. Please run with --analyse first.');
            } else {
                logger.error(ex);
            }
        } finally {
            logger.info('Close database connection');
            await dbConnector.destroy();
        }
        return 0;
    }

    @KeyPress('n')
    skipTable() {
        if (!this.generator) return;
        logger.info('Skipping...');
        this.generator.gotoNextTable();
    }
}