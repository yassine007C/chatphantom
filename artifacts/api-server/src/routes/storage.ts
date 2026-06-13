import { Router, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { RequestUploadUrlBody } from "@workspace/api-zod";

const router = Router();

// إنشاء مجلد الرفع داخل السيرفر تلقائياً إذا لم يكن موجوداً
const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// 1. بديل سحابة Replit: توليد رابط رفع داخلي وهمي
router.post("/uploads/request-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    const { name, size, contentType } = parsed.data;

    // توليد اسم فريد للصورة لمنع التكرار
    const uniqueName = Date.now() + "-" + name.replace(/[^a-zA-Z0-9.]/g, "");

    // بناء رابط ليعود المتصفح ويرفع الصورة إلى سيرفرنا بدلاً من ريبليت
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    const uploadURL = `${protocol}://${host}/api/storage/local-upload/${uniqueName}`;

    const objectPath = `/objects/${uniqueName}`;

    res.json({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

// 2. المسار الجديد لاستقبال الصورة المرفوعة وحفظها
router.put("/local-upload/:filename", (req: Request, res: Response) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  const writeStream = fs.createWriteStream(filePath);

  req.pipe(writeStream);

  req.on("end", () => {
    res.status(200).send("Uploaded successfully");
  });
  req.on("error", () => {
    res.status(500).send("Error saving file");
  });
});

// 3. عرض الصور (لكي تظهر في البروفايل والمنشورات)
router.get("/objects/*path", (req: Request, res: Response): void => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const cleanPath = wildcardPath.replace(/^objects\//, ""); 
    const filePath = path.join(UPLOADS_DIR, cleanPath);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Error serving file" });
  }
});

// 4. عرض الصور العامة
router.get("/public-objects/*filePath", (req: Request, res: Response): void => {
  try {
    const raw = req.params.filePath;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const filePath = path.join(UPLOADS_DIR, wildcardPath);

    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: "Not found" });
    }
  } catch (error) {
     res.status(500).json({ error: "Error" });
  }
});

export default router;
