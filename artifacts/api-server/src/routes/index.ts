import { Router, type IRouter } from "express";
import healthRouter from "./health";
import botBuilderRouter from "./bot-builder";

const router: IRouter = Router();

router.use(healthRouter);
router.use(botBuilderRouter);

export default router;
