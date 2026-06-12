import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import feedRouter from "./feed";
import usersRouter from "./users";
import inboxRouter from "./inbox";
import sentRouter from "./sent";
import storageRouter from "./storage";

const router: IRouter = Router();

// 1. المسارات الفرعية المنظمة ببادئة صريحة
router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/inbox", inboxRouter);
router.use("/sent", sentRouter);
router.use("/storage", storageRouter);

// 2. ربط الـ feedRouter على الجذع الرئيسي ليتوافق مع وجود كلمة "/feed" داخله
// تم حذف السطر المكرر القديم لإنهاء مشكلة التضارب والـ 404 تماماً
router.use("/", feedRouter);

// هذا السطر يخبر Express أنه إذا لم يجد أي مسار API متوافق، 
// يجب أن يعيد ملف index.html الخاص بالـ Frontend ليقوم هو بالتوجيه داخلياً
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html')); 
  // 👆 تأكد من تعديل المسار ليتوافق مع مجلد الـ build/dist الخاص بالـ frontend لديك
});

export default router;
