import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import feedRouter from "./feed";
import usersRouter from "./users";
import inboxRouter from "./inbox";
import sentRouter from "./sent";
import storageRouter from "./storage";

const router: IRouter = Router();

// أضف المسارات الفرعية هنا لتصبح الروابط واضحة
router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/feed", feedRouter);
router.use("/users", usersRouter);
router.use("/inbox", inboxRouter);
router.use("/sent", sentRouter);
router.use("/storage", storageRouter);

export default router;
