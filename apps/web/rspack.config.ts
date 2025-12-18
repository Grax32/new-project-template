import { createConfig } from '@nx/angular-rspack';
import type { Compiler, Plugin } from '@rspack/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Status file location
const STATUS_DIR = join(__dirname, '../../tmp/apps/web');
const STATUS_FILE = join(STATUS_DIR, 'build-status.json');

function writeStatus(status: {
    status: 'idle' | 'building' | 'success' | 'failed';
    lastBuildTime: string | null;
    errorCount: number;
    warningCount: number;
}) {
    try {
        mkdirSync(STATUS_DIR, { recursive: true });
        writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2));
    } catch (e) {
        console.error('[BuildStatus] Failed to write status file:', e);
    }
}

const buildStatusPlugin: Plugin = {
    apply(compiler: Compiler) {
        compiler.hooks.compile.tap('BuildStatusPlugin', () => {
            console.log('[BuildStatus] Building...');
            writeStatus({
                status: 'building',
                lastBuildTime: new Date().toISOString(),
                errorCount: 0,
                warningCount: 0
            });
        });
        compiler.hooks.done.tap('BuildStatusPlugin', (stats) => {
            const hasErrors = stats.hasErrors();
            const errorCount = hasErrors ? stats.toJson().errorsCount ?? 0 : 0;
            const warningCount = stats.hasWarnings() ? stats.toJson().warningsCount ?? 0 : 0;
            const status = hasErrors ? 'failed' : 'success';
            console.log(`[BuildStatus] Build ${status}`);
            writeStatus({
                status,
                lastBuildTime: new Date().toISOString(),
                errorCount,
                warningCount
            });
        });
    }
};

export default createConfig(
    {
        options: {
            root: __dirname,

            outputPath: {
                base: '../../dist/apps/web',
            },
            index: './src/index.html',
            browser: './src/main.ts',
            polyfills: ['zone.js'],
            tsConfig: './tsconfig.app.json',
            inlineStyleLanguage: 'scss',
            assets: [
                {
                    glob: '**/*',
                    input: './public',
                },
            ],
            styles: ['./src/styles.scss'],
            devServer: {},
        },
        rspackConfigOverrides: {
            plugins: [buildStatusPlugin]
        }
    },
    {
        production: {
            options: {
                budgets: [
                    {
                        type: 'initial',
                        maximumWarning: '500kb',
                        maximumError: '1mb',
                    },
                    {
                        type: 'anyComponentStyle',
                        maximumWarning: '4kb',
                        maximumError: '8kb',
                    },
                ],
                outputHashing: 'all',
                devServer: {},
            },
        },

        development: {
            options: {
                optimization: false,
                vendorChunk: true,
                extractLicenses: false,
                sourceMap: true,
                namedChunks: true,
                devServer: {},
            },
        },
    }
);
