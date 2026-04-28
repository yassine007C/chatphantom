import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// استيراد الملفات من مجلد artifacts بناءً على هيكلة مشروعك
// @ts-ignore
import { setupAuth } from "../../artifacts/anon-app/src/lib/auth";
// @ts-ignore


import router from "../../artifacts/api-server/src/routes/index";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// إعدادات الوسيط (Middleware)
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ربط المسارات (API Routes)
// نستخدم الـ router المستورد من api-server
app.use("/api", router);

// إعداد نظام المصادقة (Passport/Session)
// نمرر تطبيق express لملف auth ليقوم بإعداده
setupAuth(app);

// لخدمة ملفات الفرونت إند (إذا كانت موجودة في المجلد العام)
app.use(express.static(path.join(__dirname, "../../public")));

// في حال عدم وجود مسار، يتم تحويل المستخدم للرئيسية
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../../public/index.html"), (err) => {
    if (err) {
      res.status(200).send("Server is running! (No frontend files found yet)");
    }
  });
});

// تحديد المنفذ (Port)
const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`
  🚀 ==========================================
  🚀 Server is running on port: ${PORT}
  🚀 Environment: ${process.env.NODE_ENV || 'development'}
  🚀 ==========================================
  `);
});
