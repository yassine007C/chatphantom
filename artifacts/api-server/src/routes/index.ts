import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import feedRouter from "./feed";
import usersRouter from "./users";
import inboxRouter from "./inbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(feedRouter);
router.use(usersRouter);
router.use(inboxRouter);

export default router;
