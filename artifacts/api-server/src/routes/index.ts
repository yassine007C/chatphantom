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
router.use("/sent", sentRouter);
router.use("/storage", storageRouter);

// 2. إصلاح التضارب عبر ربط المسارات التي تحتوي البادئة داخلها على الجذع الرئيسي "/"
router.use("/", usersRouter); // 👈 تم التعديل لمنع تكرار /users/users
router.use("/", inboxRouter); // 👈 تم التعديل لمنع تكرار /inbox/inbox في حال وُجد
router.use("/", feedRouter);

export default router;
