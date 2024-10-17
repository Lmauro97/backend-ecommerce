import { Router } from "express";
import { methods as pagosControllers } from "../controllers/mercado_pago.controller.js";
const router = Router();

router.post("/", pagosControllers.pagar);
router.post("/getReference/:idBilling", pagosControllers.getReference);
export default router;
