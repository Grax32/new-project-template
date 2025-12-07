import 'dotenv/config';
import path from 'path';
import { defineConfig } from '@mikro-orm/postgresql';

export default defineConfig({
  dbName: process.env.POSTGRES_DB || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: +(process.env.POSTGRES_PORT || 5432),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  entities: [path.resolve(__dirname, './dist/entities')],
  entitiesTs: [path.resolve(__dirname, './src/entities')],
  migrations: {
    tableName: 'mikro_orm_migrations',
    path: path.resolve(__dirname, '../migrations'),
    glob: '!(*.d).{ts,js}',
  },
});
