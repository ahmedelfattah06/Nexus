import { Router, type IRouter } from "express";
import healthRouter from "./health";
import workspacesRouter from "./workspaces";
import pagesRouter from "./pages";
import tasksRouter from "./tasks";
import snippetsRouter from "./snippets";
import sessionsRouter from "./sessions";
import dashboardRouter from "./dashboard";
import anthropicRouter from "./anthropic";
import habitsRouter from "./habits";
import bookmarksRouter from "./bookmarks";
import readingRouter from "./reading";
import flashcardsRouter from "./flashcards";
import moodsRouter from "./moods";
import goalsRouter from "./goals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(workspacesRouter);
router.use(pagesRouter);
router.use(tasksRouter);
router.use(snippetsRouter);
router.use(sessionsRouter);
router.use(dashboardRouter);
router.use(anthropicRouter);
router.use(habitsRouter);
router.use(bookmarksRouter);
router.use(readingRouter);
router.use(flashcardsRouter);
router.use(moodsRouter);
router.use(goalsRouter);

export default router;
