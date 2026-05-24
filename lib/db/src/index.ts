import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// 🚀 هنا يكمن السر: إعدادات إدارة حوض الاتصالات (Connection Pooling)
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // الحد الأقصى للاتصالات المتزامنة (10 كافية جداً وسريعة)
  idleTimeoutMillis: 15000, // إغلاق أي اتصال خامل (لم يتم استخدامه) بعد 15 ثانية فوراً
  connectionTimeoutMillis: 5000, // إذا لم تستجب قاعدة البيانات خلال 5 ثوانٍ، اقطع الاتصال بدلاً من الانتظار للأبد
  allowExitOnIdle: true // يسمح للسيرفر بتحرير الموارد عندما لا يكون هناك ضغط
});

export const db = drizzle(pool, { schema });

export * from "./schema";
