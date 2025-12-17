import { readFileSync } from 'fs';
import path, { join } from 'path';
import * as jsoncParser from 'jsonc-parser';
import { Configuration } from '../models/types';
import { getErrorString } from '../shared/functions';

// We will use this date to limit the docker logs returned to only those since the server started
// ( and maybe other things )
const programStart = new Date();

/**
 * Determine ROOT and SOLUTIONROOT based on the location of this file and the src folder
 * @param startDir current directory to start searching from
 * @returns object with ROOT and SOLUTIONROOT paths
 */
function findSrcRoot(startDir: string): { ROOT: string; SOLUTIONROOT: string; } {
    let current = startDir;
    while (true) {
        const base = path.basename(current);
        if (base === 'src') {
            return { ROOT: current, SOLUTIONROOT: path.dirname(current) };
        }
        const parent = path.dirname(current);
        if (parent === current) {
            throw new Error("Could not find 'src' folder in parent directories.");
        }
        current = parent;
    }
}

function loadProgramsConfig(): Readonly<Configuration> {

    const { ROOT, SOLUTIONROOT } = findSrcRoot(__dirname);

    const configPath = join(SOLUTIONROOT, 'programs.conf.jsonc');

    try {
        const raw = readFileSync(configPath, 'utf8');
        const configuration: Configuration = jsoncParser.parse(raw);
        configuration.root = ROOT;
        configuration.solutionRoot = SOLUTIONROOT;
        configuration.startTime = programStart;

        if (!configuration.programs || typeof configuration.programs !== 'object') {
            throw new Error("Invalid configuration: 'programs' section is missing or malformed.");
        }

        if (!configuration.port || typeof configuration.port !== 'number') {
            throw new Error("Invalid configuration: 'port' is missing or not a number.");
        }

        // Resolve working directories for each program, relative to the config file location
        Object.entries(configuration.programs).forEach(([, prog]) => {
            // Resolve working directory relative to the config file location
            const relativeCwd = prog.cwd || '.';
            prog.cwd = path.resolve(SOLUTIONROOT, relativeCwd);
            console.log(`Configured program working directory: ${JSON.stringify(prog.cwd)}, resolved from: ${relativeCwd} relative to ${SOLUTIONROOT}`);
            // Freeze each program configuration to make it read-only
            Object.freeze(prog);
        });

        // Freeze the configuration to make it read-only
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
