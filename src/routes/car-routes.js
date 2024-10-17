import { Router } from "express";
import { methods as carController } from "../controllers/car.controller.js";
const router = Router();

router.get("/", carController.getListCar);
router.post("/addProduct", carController.addCar);
router.post("/verificarCar", carController.verificarCar);

export default router;
