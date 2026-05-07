import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url"; // أضف هذا السطر

// --- تعريف __dirname لنظام ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// ---------------------------------------

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// تأكد من عدم تكرار هذا السطر مرتين
app.use("/api", router);

app.get("/ping", (req, res) => res.send("pong"));

// مسار ملفات الواجهة (Frontend)
const clientPath = path.join(__dirname, "../../anon-app/dist");
app.use(express.static(clientPath));

// توجيه أي طلب غير معروف للـ index.html لدعم React Router
// بدلاً من app.get("*", ...
app.get("(.*)", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientPath, "index.html"));
  }
});

export default app;
