import type { Knex } from 'knex';
import { config } from './src/config/index.js';

const knexConfig: Knex.Config = {
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl,
  },
  migrations: {
    directory: './src/db/migrations',
    extension: 'ts',
  },
  pool: {
    min: 2,
    max: 10,
  },
};

export default knexConfig;
