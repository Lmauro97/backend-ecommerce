import { Router } from "express";
// import { methods as userController } from "../controllers/user.controller.js";

import { methods as getTypeIdentity } from "../controllers/domain.controller.js";

const router = Router();

router.get("/typeIdentity", getTypeIdentity.getTypeIdentity);
router.get("/departamet", getTypeIdentity.getDepartament);
router.get("/city", getTypeIdentity.getCity);
router.get("/state", getTypeIdentity.getState);
router.get("/providers", getTypeIdentity.getProviders);
router.get("/owner", getTypeIdentity.getOwner);
router.get("/tarifa", getTypeIdentity.getTarifa);
router.get("/label", getTypeIdentity.getLabel);
router.post("/insertLabel", getTypeIdentity.addLabel);

export default router;
