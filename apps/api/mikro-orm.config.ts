import 'dotenv/config';
import path from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
import { defineConfig } from '@mikro-orm/postgresql';

// Prefer loading entity classes directly (most robust). Fall back to globs.
const compiledEntitiesGlob = path.resolve(__dirname, './dist/entities/**/*.js');
const tsEntitiesGlob = path.resolve(__dirname, './src/entities/**/*.ts');
const compiledEntitiesDir = path.resolve(__dirname, './dist/entities');
const tsEntitiesDir = path.resolve(__dirname, './src/entities');

const useCompiled = existsSync(path.resolve(__dirname, './dist'));

function loadEntityClassesFrom(dir: string) {
    const entities: any[] = [];
    try {
        if (!existsSync(dir)) return entities;
        const files = readdirSync(dir);
        for (const f of files) {
            const full = path.resolve(dir, f);
            // support nested dirs
            if (statSync(full).isDirectory()) {
                entities.push(...loadEntityClassesFrom(full));
                continue;
            }
            if (!/\.([jt]s|tsx?)$/.test(f) || f.endsWith('.d.ts')) continue;
            try {
                // dynamic require should work for compiled JS. For TS runtime (tsx/ts-node)
                // it may also work because ts-node/tsx registers loaders.
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const mod = require(full);
                for (const v of Object.values(mod)) {
                    if (typeof v === 'function') entities.push(v);
                }
            } catch (err) {
                // ignore per-file errors; we'll fallback to globs below
            }
        }
    } catch (err) {
        // ignore and return empty list
    }
    return entities;
}

const candidateDir = useCompiled ? compiledEntitiesDir : tsEntitiesDir;
const foundEntities = loadEntityClassesFrom(candidateDir);

if (foundEntities.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
        `MikroORM: loaded ${foundEntities.length} entity classes from ${candidateDir}`,
    );
} else {
    // eslint-disable-next-line no-console
    console.log(
        'MikroORM: no entity classes loaded from',
        candidateDir,
        '— falling back to globs',
    );
}

// if we found entity classes, use them directly;
// otherwise fall back to globs
// (foundEntities) || [compiledEntitiesGlob] || [tsEntitiesGlob]

function getEntities() {
    if (foundEntities.length > 0) {
        return foundEntities;
    } else if (useCompiled) {
        return [compiledEntitiesGlob];
    } else {
        return [tsEntitiesGlob];
    }
}

const entities = getEntities();

export default defineConfig({
    dbName: process.env.POSTGRES_DB || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: +(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    entities,
    entitiesTs: [tsEntitiesGlob],
    migrations: {
        tableName: 'mikro_orm_migrations',
        path: path.resolve(__dirname, '../migrations'),
        glob: '!(*.d).{ts,js}',
    },
});
