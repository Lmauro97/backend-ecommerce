import { Router } from "express";
import { methods as analyticsController } from "../controllers/analytics.controller.js";

const router = Router();

router.get("/ordersList", analyticsController.getListOrdes);
router.post("/newOrdersList", analyticsController.createOrder);
router.post("/entrega", analyticsController.ordenEntregada);

export default router;
