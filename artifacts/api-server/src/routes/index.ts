import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import feedRouter from "./feed";
import usersRouter from "./users";
import inboxRouter from "./inbox";
import sentRouter from "./sent";
import storageRouter from "./storage";


const router: IRouter = Router();

// 1. مسارات فرعية منسقة
router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/storage", storageRouter);

// 2. ربط المسارات التي تحتوي البادئة داخلها على الجذع الرئيسي "/" لمنع التكرار (404)
router.use("/", usersRouter);
router.use("/", inboxRouter);
router.use("/", sentRouter); // 👈 انقل هذا السطر إلى هنا لمنع تكرار /sent/sent
router.use("/", feedRouter);

export default router;
