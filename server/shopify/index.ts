/**
 * Shopify Router Index v2.0
 * 
 * Main router combining auth, webhooks, and API routes for Shopify integration.
 * 
 * @version 2.0.0
 * @adaptable true - All sub-routes handle missing credentials gracefully
 */

import { Router } from "express";
import authRouter from "./auth";
import webhooksRouter from "./webhooks";
import apiRouter from "./api";

const router = Router();

router.use("/auth", authRouter);
router.use("/webhooks", webhooksRouter);
router.use("/", apiRouter);

export default router;
