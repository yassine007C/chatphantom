import { Router, type Request, type Response } from "express";
import { RequestUploadUrlBody } from "@workspace/api-zod";
import crypto from "crypto"; // مكتبة مدمجة في Node.js لعمل التوقيع الرقمي

const router = Router();

// جلب الإعدادات الأساسية مباشرة من لوحة تحكم Cloudinary الرئيسية
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

/**
 * 1. توليد رابط رفع داخلي وهمي ليتوافق مع الفرونت إند
 */
router.post("/uploads/request-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid data" });
      return;
    }
    const { name, size, contentType } = parsed.data;

    // توليد معرف فريد تماماً للصورة
    const uniqueId = "img_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers.host;
    
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
 * 2. استقبال الصورة ورفعها بتوقيع رقمي آمن إلى Cloudinary
 */
router.put("/local-upload/:publicId", async (req: Request, res: Response): Promise<void> => {
  try {
    const publicId = req.params.publicId;

    if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
      console.error("Cloudinary Configuration Missing!");
      res.status(500).json({ error: "بيانات Cloudinary غير مكتملة في متغيرات بيئة Render." });
      return;
    }

    // تجميع بيانات الصورة بشكل آمن سواء كانت Stream أو ممسوكة بواسطة Body Parser
    let buffer: Buffer;
    if (req.body && Buffer.isBuffer(req.body)) {
      buffer = req.body;
    } else if (req.body && typeof req.body === "string") {
      buffer = Buffer.from(req.body);
    } else {
      const chunks: any[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      buffer = Buffer.concat(chunks);
    }

    if (buffer.length === 0) {
      res.status(400).json({ error: "لم يتم استقبال أي بيانات للصورة" });
      return;
    }

    // تحويل الصورة إلى Base64 Data URI
    const base64Data = buffer.toString("base64");
    const fileDataUri = `data:${req.headers["content-type"] || "image/jpeg"};base64,${base64Data}`;

    // إنشاء التوقيع الرقمي (Signature) بناءً على توثيق Cloudinary الرسمي
    const timestamp = Math.floor(Date.now() / 1000).toString();
    // الترتيب الأبجدي للمتغيرات إلزامي: public_id ثم timestamp
    const strToSign = `public_id=${publicId}&timestamp=${timestamp}${API_SECRET}`;
    const signature = crypto.createHash("sha1").update(strToSign).digest("hex");

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: fileDataUri,
        public_id: publicId,
        timestamp: timestamp,
        api_key: API_KEY,
        signature: signature,
      }),
    });

    const result = await response.json() as any;

    if (!response.ok) {
      console.error("Cloudinary Error Response:", result);
      res.status(response.status || 500).json({ error: "فشل الرفع إلى Cloudinary", details: result?.error?.message });
      return;
    }

    res.status(200).send("Uploaded to cloud successfully");
  } catch (error: any) {
    console.error("Server PUT Error:", error);
    res.status(500).json({ error: "حدث خطأ داخلي أثناء الرفع", details: error?.message });
  }
});

/**
 * 3. عرض واستدعاء الصور عبر تحويلها إلى رابط Cloudinary الدائم
 */
router.get("/objects/:publicId", (req: Request, res: Response): void => {
  const publicId = req.params.publicId;
  const cloudImageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
  res.redirect(cloudImageUrl);
});

/**
 * 4. عرض الصور العامة
 */
router.get("/public-objects/:publicId", (req: Request, res: Response): void => {
  const publicId = req.params.publicId;
  const cloudImageUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${publicId}`;
  res.redirect(cloudImageUrl);
});

export default router;
