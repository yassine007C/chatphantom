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
    // 1. إنشاء الجداول الأساسية إذا لم تكن موجودة لمنع خطأ الـ Relation does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        avatar_url TEXT
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS public_posts (
        id SERIAL PRIMARY KEY,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. تطبيق التعديلات (Migrations) على الأعمدة
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

    logger.info("✅ Migrations applied successfully");
  } catch (err) {
    // استخدمنا console.error هنا لضمان ظهور الخطأ في Render قبل خروج السيرفر
    console.error("🚨 Migration Error Details:", err);
    process.exit(1);
  } finally {
    client.release();
  }
}

// البدء في تشغيل العمليات
runMigrations().then(() => {
  app.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "🚀 Server listening and ready!");
  });
}).catch((err) => {
  console.error("🚨 Failed to start application:", err);
  process.exit(1);
});
