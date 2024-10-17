import express from "express";
import morgan from "morgan";
import cors from "cors"; ///permite que el servidor acepte peticiones de otros servidores

//Router
import userRoutes from "./routes/user-routes.js";
import pqrsRoutes from "./routes/pqrs-routes.js";
import productRoutes from "./routes/product-routes.js";
import carRoutes from "./routes/car-routes.js";
import pagosRoutes from "./routes/mercado_pago-routes.js";
import categoriaRoutes from "./routes/categoria-routes.js";
import listDomain from "./routes/domain-routes.js";
import authRoutes from "./routes/auth-routes.js";
import analiticsRoutes from "./routes/analytics-routes.js";

const app = express();
const port = process.env.PORT || 3000;
//Settings puerto
app.set("port", port);

// Middlwares funciones entre peticiones y
app.use(morgan("dev"));
// app.use(express.json());
// Aumentar el límite de carga a 50 MB (puedes ajustar según tus necesidades)
app.use(express.json({ limit: "50mb" }));
app.use(cors()); //todos los cors

// Routes
app.use("/user", userRoutes);
// app.post("/user", userRoutes);

app.use("/pqrs", pqrsRoutes);

app.use("/list-product", productRoutes);
app.use("/product", productRoutes);
app.use("/shoppingCar", carRoutes);
app.use("/listProductUser", carRoutes);

app.use("/pagarproduct", pagosRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/list", listDomain);
app.use("/auth", authRoutes);
app.use("/analitics", analiticsRoutes);

// Agregue este middleware para servir archivos estáticos
// app.use(express.static("fotosProducts"));
// app.use(express.static("fotosUsuarios"));
// app.use(express.static("fotosDelSistema"));
// app.use(express.static("filePqrs"));

export default app;
