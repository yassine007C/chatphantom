import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { setupAuth } from "./auth.js"; // ملف معالجة تسجيل الدخول
import { registerRoutes } from "./routes.js"; // ملف المسارات (API)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// إعداد نظام التوثيق (Login/Sign Up)
setupAuth(app);

// تسجيل مسارات الـ API (مثل إرسال الرسائل المجهولة)
registerRoutes(app);

// خدمة ملفات الواجهة الأمامية بعد عمل Build
const clientDistPath = path.resolve(__dirname, "../../artifacts/anon-app/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDistPath));
  
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
}

const port = process.env.PORT || 10000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
});
