import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import feedRouter from "./feed";
import usersRouter from "./users";
import inboxRouter from "./inbox";
import sentRouter from "./sent";
import storageRouter from "./storage";

const router: IRouter = Router();

// 1. مسارات فرعية لا تحتوي على البادئة داخل ملفاتها الخاصة
router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/sent", sentRouter);
router.use("/storage", storageRouter);

// 2. مسارات تحتوي بالفعل على البادئة (مثل /inbox و /users) داخل الكود الخاص بها
// نربطها هنا على الجذع "/" مباشرة لمنع التكرار المسبب للـ 404 (مثل /inbox/inbox)
router.use("/", usersRouter);  // لتشغيل الدليل /directory أو /users
router.use("/", inboxRouter);  // لتشغيل صندوق الوارد /inbox فوراً 🎉
router.use("/", feedRouter);

export default router;
