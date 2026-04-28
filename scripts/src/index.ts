import express from "express";
import path from "path";
import { fileURLToPath } from "url";
// @ts-ignore
import { setupAuth } from "../../artifacts/anon-app/src/lib/auth";
// استبدل السطر القديم بهذا السطر الذي يشير للمجلد الصحيح الذي وجدناه في بحثك
// @ts-ignore
import { router } from "../../artifacts/api-server/src/routes/index";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// تأكد من استخدام الـ router الذي استوردته
app.use("/api", router);

// إعداد المصادقة
setupAuth(app);

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
