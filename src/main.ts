import { CliMain, CliMainClass, CliParameter, KeyPress, Modifiers } from '@corteks/clify';
import { execSync } from 'child_process';
import cliProgress, { SingleBar } from 'cli-progress';
import colors from 'colors';
import * as fs from 'fs-extra';
import * as JSONC from 'jsonc-parser';
import { getLogger } from 'log4js';
import * as path from 'path';
import 'reflect-metadata';
import { parse } from 'uri-js';
import { DatabaseConnector, DatabaseConnectorBuilder } from './database/database-connector-builder';
import { Filler, ProgressEvent } from './generation/filler';
import { CustomSchema } from './schema/custom-schema.class';
import { CustomizedSchema } from './schema/customized-schema.class';
import { Schema } from './schema/schema.class';

const logger = getLogger();
logger.level = 'debug';

@CliMain
class Main extends CliMainClass {
    @CliParameter({ alias: 'db', demandOption: true, description: 'Database URI. Eg: mysql://user:password@127.0.0.1:3306/database' })
    private uri: string | undefined = undefined;

    @CliParameter({ description: 'Extrat schema information and generate default settings' })
    private analyse: boolean = false;

    @CliParameter({ description: 'Empty tables before filling them' })
    private reset: boolean = false;

    private dbConnector: DatabaseConnector | undefined;
    private filler: Filler | undefined;

    async main(): Promise<number> {
        if (!this.uri) throw new Error('Please provide a valid database uri');

        const dbConnectorBuilder = new DatabaseConnectorBuilder(this.uri);
        try {
            this.dbConnector = await dbConnectorBuilder.build();
        } catch (err) {
            logger.error(err.message);
            return 1;
        }
        if (!fs.pathExistsSync('settings')) {
            fs.mkdirSync('settings');
        }
        if (!fs.pathExistsSync(path.join('settings', 'scripts'))) {
            fs.mkdirSync(path.join('settings', 'scripts'));
        }
        try {
            if (this.analyse) {
                return await this.generateSchemaFromDB();
            };

            await this.generateData();
        } catch (ex) {
            if (ex.code === 'ENOENT') {
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
            const customSchema = new CustomSchema();
            fs.writeJSONSync(path.join('settings', 'custom_schema.jsonc'), customSchema, { spaces: 4 });
        }
        return 0;
    }

    async runScripts() {
        if (!this.dbConnector) throw new Error('DB connection not ready');
        if (!fs.existsSync(path.join('settings', 'scripts'))) {
            logger.info('No scripts provided.');
            return;
        }
        const scripts = fs.readdirSync(path.join('settings', 'scripts'));
        if (scripts.length === 0) {
            logger.info('No scripts provided.');
            return;
        }
        const parsedUri = parse(this.uri!);
        for (const script of scripts) {
            if (!script.endsWith('.sql')) continue;
            logger.info(`Running script: ${script}`);
            execSync(`mysql -h ${parsedUri.host!} --port=${parsedUri.port!.toString()} --protocol=tcp --default-character-set=utf8 -c -u ${parsedUri.userinfo!.split(':')[0]} -p"${parsedUri.userinfo!.split(':')[1]}" ${parsedUri.path?.replace('/', '')} < "${script}"`, {
                cwd: path.join('settings', 'scripts'),
                stdio: 'pipe',
            });
        }
    }

    async generateData() {
        if (!this.dbConnector) throw new Error('DB connection not ready');
        const schema: Schema = await Schema.fromJSON(fs.readJSONSync(path.join('settings', 'schema.json')));
        let customSchema: CustomSchema = new CustomSchema();
        try {
            customSchema = JSONC.parse(fs.readFileSync(path.join('settings', 'custom_schema.jsonc')).toString());
        } catch (ex) {
            logger.warn('Unable to read ./settings/custom_schema.json, this will not take any customization into account.');
        }
        try {
            await this.runScripts();
        } catch (ex) {
            logger.error('An error occured while running scripts:');
            logger.error(ex.message);
            return;
        }
        const customizedSchema = CustomizedSchema.create(schema, customSchema);
        this.filler = new Filler(this.dbConnector, customizedSchema, this.progressEventHandler());

        await this.dbConnector.backupTriggers(customSchema.tables.filter(table => table.maxLines || table.addLines).map(table => table.name));
        await this.filler.fillTables(this.reset);
        this.dbConnector.cleanBackupTriggers();
    }

    progressEventHandler() {
        let previousEvent: ProgressEvent = { currentTable: '', currentValue: 0, max: 0, state: 'DONE', step: '' };
        let currentProgress: SingleBar;
        return (event: ProgressEvent) => {
            let diff = false;
            if (previousEvent.currentTable !== event.currentTable) {
                console.log(colors.green(event.currentTable));
                diff = true;
            }
            if (previousEvent.step !== event.step) {
                diff = true;
            }
            if (diff === true) {
                if (currentProgress) currentProgress.stop();
                currentProgress = new cliProgress.SingleBar({
                    format: `${event.step + new Array(16 - event.step.length).join(' ')} | ${colors.cyan('{bar}')} | {percentage}% | {value}/{total} | {comment}`,
                    stopOnComplete: true,
                });
                currentProgress.start(event.max, event.currentValue, { comment: event.comment || '' });
            } else {
                event.comment = [previousEvent.comment, event.comment].join('');
                if (currentProgress) currentProgress.update(event.currentValue, { comment: event.comment });
                if (event.state === 'DONE') currentProgress.stop();
            }
            previousEvent = event;
        };
    }

    @KeyPress('n', Modifiers.NONE, 'Skip the current table. Only works during data generation phase.')
    skipTable() {
        if (!this.filler) return;
        logger.info('Skipping...');
        this.filler.gotoNextTable();
    }
}