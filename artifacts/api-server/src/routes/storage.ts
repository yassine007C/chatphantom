import { Router, type Request, type Response } from "express";
import { RequestUploadUrlBody } from "@workspace/api-zod";

const router = Router();

// جلب الإعدادات من بيئة العمل (Render Environment Variables)
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "your_cloud_name";
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "your_preset_name";

/**
 * 1. توليد رابط رفع داخلي وهمي (للحفاظ على توافق الفرونت إند الحالي)
 */
router.post("/uploads/request-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    const { name, size, contentType } = parsed.data;

    // توليد معرف فريد للصورة
    const uniqueId = "img_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    
    // المتصفح سيرسل الصورة إلى سيرفرنا أولاً عبر هذا الرابط لتجنب تعديل كود الـ Frontend
    const uploadURL = `${protocol}://${host}/api/storage/local-upload/${uniqueId}`;
    const objectPath = `/objects/${uniqueId}`; 

    res.json({
      uploadURL,
      objectPath,
      metadata: { name, size, contentType },
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate URL" });
  }
});

/**
 * 2. استقبال الصورة كـ Stream وتحويلها فوراً إلى Cloudinary دون لمس القرص الصلب
 */
router.put("/local-upload/*publicId", async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = req.params.publicId;
    const publicId = Array.isArray(raw) ? raw.join("/") : raw;
    const chunks: any[] = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        
        // تحويل البيانات الثنائية (Binary) إلى صيغة Base64 المطلوبة لـ Cloudinary API
        const base64Data = buffer.toString("base64");
        const fileDataUri = `data:${req.headers["content-type"] || "image/jpeg"};base64,${base64Data}`;

        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
        
        // الرفع عبر الـ REST API الافتراضي
        const response = await fetch(cloudinaryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file: fileDataUri,
            upload_preset: UPLOAD_PRESET,
            public_id: publicId, 
          }),
        });

        const result = await response.json() as any;

        if (!response.ok) {
          console.error("Cloudinary Error:", result);
          res.status(500).send("Failed to upload to cloud storage");
          return;
        }

        res.status(200).send("Uploaded to cloud successfully");
      } catch (err) {
        console.error("Processing error:", err);
        res.status(500).send("Error processing cloud upload");
      }
    });
  } catch (error) {
    res.status(500).send("Server error");
  }
});

/**
 * 3. عرض الصور وعمل تحويل (Redirect) مباشر وصريح إلى رابط كلوديناري الدائم
 */
router.get("/objects/*publicId", (req: Request, res: Response): void => {
  const raw = req.params.publicId;
  const publicId = Array.isArray(raw) ? raw.join("/") : raw;
  const cloudImageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
  res.redirect(cloudImageUrl);
});

/**
 * 4. عرض الصور العامة
 */
router.get("/public-objects/*publicId", (req: Request, res: Response): void => {
  const raw = req.params.publicId;
  const publicId = Array.isArray(raw) ? raw.join("/") : raw;
  const cloudImageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
  res.redirect(cloudImageUrl);
});

export default router;
