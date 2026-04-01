import { db } from '../db/connection.js';
import { logger } from '../lib/logger.js';

export async function runMigrations() {
  try {
    logger.info('Running database migrations...');
    await db.migrate.latest({
      directory: './dist/db/migrations',
      extension: 'js',
    });
    logger.info('Migrations completed successfully');
  } catch (err) {
    logger.error(err, 'Migration failed');
    throw err;
  }
}

// Run directly if called as script
const isDirectRun = process.argv[1]?.includes('migrate');
if (isDirectRun) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
