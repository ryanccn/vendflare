import { env } from 'cloudflare:workers';
import { applyD1Migrations } from 'cloudflare:test';
import { setupTestingUser } from './utils';

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
await setupTestingUser();
