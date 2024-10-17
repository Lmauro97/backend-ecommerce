import { Router } from "express";
import { methods as categoriaController } from "../controllers/categoria.controller.js";
const router = Router();

router.get("/", categoriaController.getListCategoria);

export default router;
