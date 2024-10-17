import { Router } from "express";
import { methods as productController } from "../controllers/product.controller.js";
import multer from "multer";
const upload = multer({ dest: "fotosProducts" });

const router = Router();

router.get("/", productController.getProduct);
router.get("/activo", productController.getProductActivo);
router.get("/categoria/:idCategoria", productController.getProductCategoria);

router.get("/topProduct", productController.getProductTop);
router.get("/productBanner", productController.getProductBanner);

router.post("/", productController.addProduct);
// router.post("/crearProducto", productController.addProduct);
router.post(
  "/crearProducto",
  upload.array("listImg"),
  productController.addProduct
);
router.post(
  "/EditProducto",
  upload.array("listImg"),
  productController.editProduct
);

router.post("/deleteProduct", productController.deletProduct);
router.post("/updateProduct", productController.updateProduct);
router.get("/detalleProduct/:idProducto", productController.getDetalleProduct);
router.get(
  "/detalleProductEdit/:idProducto",
  productController.getDetalleProductEdit
);

export default router;
