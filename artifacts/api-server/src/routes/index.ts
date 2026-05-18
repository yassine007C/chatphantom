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

export default router;
