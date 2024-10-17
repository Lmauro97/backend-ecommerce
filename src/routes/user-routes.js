import { Router } from "express";
import { methods as userController } from "../controllers/user.controller.js";
import multer from "multer";
const rutaImg = multer({ dest: "fotosUsuarios" });

const router = Router();

router.get("/lista", userController.getListUser);
router.get("/getUserPerfil", userController.getUser);
router.post("/nuevo", rutaImg.array("listImg"), userController.addUser);
router.put("/update", userController.updateUser);
router.put("/anularSuscripcion", userController.lowSuscripcion);
router.put("/updateFoto", rutaImg.array("listImg"), userController.updateFoto);
router.get("/listaCompras", userController.getUserCompras);
router.get("/listaFacturas", userController.getUserFacturas);

export default router;
