import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspacesRouter from "./workspaces";
import pagesRouter from "./pages";
import tasksRouter from "./tasks";
import snippetsRouter from "./snippets";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import anthropicRouter from "./anthropic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspacesRouter);
router.use(pagesRouter);
router.use(tasksRouter);
router.use(snippetsRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);
router.use(anthropicRouter);

export default router;
