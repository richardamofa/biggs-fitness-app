import { Router }        from "express";
import { saveContact }   from "../controllers/contactController.js";

const router = Router();

router.post("/", saveContact);

export default router;