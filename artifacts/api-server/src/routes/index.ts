import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import lessonsRouter from "./lessons";
import progressRouter from "./progress";
import sessionsRouter from "./sessions";
import apiKeysRouter from "./apiKeys";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(lessonsRouter);
router.use(progressRouter);
router.use(sessionsRouter);
router.use(apiKeysRouter);
router.use(adminRouter);

export default router;
