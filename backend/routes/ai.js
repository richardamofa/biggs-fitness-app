import { Router }                        from "express";
import { generatePlan, quickSession }    from "../controllers/aiController.js";

const router = Router();

router.post("/generate-plan",  generatePlan);
router.post("/quick-session",  quickSession);

export default router;