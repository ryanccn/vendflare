import { applyD1Migrations, env } from 'cloudflare:test';
import { setupTestingUser } from './utils';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await setupTestingUser();
