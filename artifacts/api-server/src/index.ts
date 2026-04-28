import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE conversations
      ADD COLUMN IF NOT EXISTS anonymous_alias text NOT NULL DEFAULT 'Anonymous'
    `);
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS avatar_url text
    `);
    await client.query(`
      ALTER TABLE public_posts
      ADD COLUMN IF NOT EXISTS image_url text
    `);
    await client.query(`
      ALTER TABLE messages
      ADD COLUMN IF NOT EXISTS image_url text
    `);
    logger.info("Migrations applied");
  } catch (err) {
    console.error("🚨 Migration Error:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}).catch((err) => {
  logger.error({ err }, "Failed to run migrations, exiting");
  process.exit(1);
});
