import 'reflect-metadata';
import { getLogger } from 'log4js';
import { CliMain, CliMainClass, CliParameter, KeyPress, Modifiers } from '@corteks/clify';
import * as fs from 'fs-extra';
import { Generator } from './generation/generator';
import { DatabaseConnectorBuilder, DatabaseConnector } from './database/database-connector-builder';
import * as path from 'path';
import * as JSONC from 'jsonc-parser';
import { Schema } from './schema/schema.class';
import { CustomSchema } from './schema/custom-schema.class';
import { CustomizedSchema } from './schema/customized-schema.class';
import { DatabaseEngines } from './database/database-engines';

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

    private dbConnector: DatabaseConnector | undefined;
    private generator: Generator | undefined;

    async main(): Promise<number> {
        if (!this.database) throw new Error('Please provide a valid database name');
        const [host, port] = this.host.split(':');
        const dbConnectorBuilder = new DatabaseConnectorBuilder(DatabaseEngines.MARIADB);
        try {
            this.dbConnector = await dbConnectorBuilder
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
                return await this.generateSchemaFromDB();
            };

            await this.generateData();
        } catch (ex) {
            if (ex.code == 'ENOENT') {
                logger.error('Unable to read from ./settings/schema.json. Please run with --analyse first.');
            } else {
                logger.error(ex);
            }
        } finally {
            logger.info('Close database connection');
            await this.dbConnector.destroy();
        }
        return 0;
    }

    async generateSchemaFromDB() {
        if (!this.dbConnector) throw new Error('DB connection not ready');
        const schema = await this.dbConnector.getSchema();
        fs.writeJSONSync(path.join('settings', 'schema.json'), schema.toJSON(), { spaces: 4 });
        if (!fs.existsSync(path.join('settings', 'custom_schema.jsonc'))) {
            let customSchema = new CustomSchema();
            fs.writeJSONSync(path.join('settings', 'custom_schema.jsonc'), customSchema, { spaces: 4 });
        }
        return 0;
    }

    async generateData() {
        if (!this.dbConnector) throw new Error('DB connection not ready');
        let schema: Schema = await Schema.fromJSON(fs.readJSONSync(path.join('settings', 'schema.json')));
        let customSchema: CustomSchema = new CustomSchema();
        try {
            customSchema = JSONC.parse(fs.readFileSync(path.join('settings', 'custom_schema.jsonc')).toString());
        } catch (ex) {
            logger.warn('Unable to read ./settings/custom_schema.json, this will not take any customization into account.');
        }
        const customizedSchema = CustomizedSchema.create(schema, customSchema);
        this.generator = new Generator(this.dbConnector, customizedSchema, logger);

        await this.dbConnector.backupTriggers(customSchema.tables.filter(table => table.maxLines || table.addLines).map(table => table.name));
        await this.generator.fillTables(this.reset);
        this.dbConnector.cleanBackupTriggers();
    }

    @KeyPress('n', Modifiers.NONE, 'Skip the current table. Only works during data generation phase.')
    skipTable() {
        if (!this.generator) return;
        logger.info('Skipping...');
        this.generator.gotoNextTable();
    }
}