import { Router } from "express";
import { methods as pqrsController } from "../controllers/pqrs.controller.js";
import multer from "multer";
const rutaImg = multer({ dest: "filePqrs" });

const router = Router();

router.get("/lista", pqrsController.getPqrs);
router.get("/listaUser", pqrsController.getPqrsUser);
router.post("/addPqrs", rutaImg.array("fileSolicitud"), pqrsController.addPqrs);

export default router;
