import { Router } from "express";
import { methods as loginController } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginController.authLogin);
router.post("/remember-pass", loginController.rememberPass);

export default router;
