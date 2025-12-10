import { readFileSync } from 'fs';
import { join } from 'path';
import * as jsoncParser from 'jsonc-parser';
import { Configuration } from './library/types';
import { getErrorString } from './functions';

const PORT = 4500;
const MAX_LOGS = 200;

// We will use this date to limit the docker logs returned to only those since the server started
// ( and maybe other things )
const programStart = new Date();

// presume the root is one level up from src and config files are there
const ROOT = join(__dirname, '..');

// presume the solution root is two levels up
const SOLUTIONROOT = join(__dirname, '..', '..');

function loadProgramsConfig(): Readonly<Configuration> {
    const configPath = join(ROOT, 'programs.conf.jsonc');
    try {
        const raw = readFileSync(configPath, 'utf8');
        const configuration: Configuration = jsoncParser.parse(raw);
        configuration.port = PORT;
        configuration.maxLogs = MAX_LOGS;
        configuration.root = ROOT;
        configuration.solutionRoot = SOLUTIONROOT;
        configuration.startTime = programStart;

        Object.freeze(configuration.programs);
        Object.freeze(configuration);

        const configResult: Readonly<Configuration> = configuration;
        return configResult;
    } catch (e) {
        console.error(`Failed to load programs.conf.jsonc: ${getErrorString(e)}`);
        throw e;
    }
}

const config = loadProgramsConfig();
export default config;
