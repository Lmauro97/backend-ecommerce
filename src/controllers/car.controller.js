import { getConnection } from "../database/database.js";
import { authMiddleware } from "../middleware/auth-middleware.js";

//lista de productos del carrito por usuario
const getListCar = async (req, res) => {
  try {
    //obtener el token
    // si no tiene token no consulta los productos
    if (!req.headers.authorization) {
      return;
    }
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);
    let id_user;

    //si el token no pasa la verificacion no se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      id_user = tokenData.idIser;

      const connetion = await getConnection();
      const result = await connetion.query(
        `SELECT sh.*,pt.product_name ,pt.main_photo,pt.sale_price,pt.code,pt.promotion_price,pt.on_promocion,pt.stock,pt.peso_total,ow.id_owner   FROM shopping_cart sh INNER JOIN product pt ON sh.id_product = pt.id INNER JOIN owner ow ON pt.id_owner = ow.id_owner WHERE sh.id_user = ${id_user}`
      );
      res.json(result);
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

// **********adiciona un producto al carrito**********
const addCar = async (req, res) => {
  try {
    const { id_product, amount } = req.body;
    // si no tiene token no consulta los productos
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }
    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);
    let id_user;

    //si el token no pasa la verificacion no se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      id_user = tokenData.idIser;
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }

    // Conexión a la base de datos
    const connection = await getConnection();

    const textConsult = `SELECT us.id FROM user us WHERE us.id = '${id_user}'`;
    const textConsultStock = `SELECT stock FROM product WHERE id='${id_product}'`;

    const resultConsultUser = await connection.query(textConsult);
    const resultConsultStock = await connection.query(textConsultStock);
    const stock = resultConsultStock[0].stock;

    //paso #1 verifica si hay un usuario con el id
    if (resultConsultUser && resultConsultUser.length < 1) {
      return res.json("Usuario no encontrado");
    }

    // Verificar si ya existe un registro con el mismo usuario y producto
    const existingRecord = await connection.query(
      "SELECT * FROM shopping_cart WHERE id_product = ? AND id_user = ?",
      [id_product, id_user]
    );

    if (existingRecord.length > 0) {
      // Si ya existe un registro, actualiza la cantidad en lugar de insertar uno nuevo
      const updatedAmount = existingRecord[0].amount + amount;

      if (updatedAmount > stock) {
        return res.json("No hay suficiente stock");
      }
      await connection.query(
        "UPDATE shopping_cart SET amount = ? WHERE id_product = ? AND id_user = ?",
        [updatedAmount, id_product, id_user]
      );
      res.json("Cantidad Actualizada");
    } else {
      // Si no existe un registro, inserta uno nuevo
      if (amount > stock) {
        return res.json("No hay suficiente stock");
      }
      const newRecord = { id_product, id_user, amount };
      await connection.query("INSERT INTO shopping_cart SET ?", newRecord);
      res.json("Producto Agregado Con Exito");
    }
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
// **********adiciona un producto al carrito**********
const verificarCar = async (req, res) => {
  try {
    const { id_product, amount } = req.body;
    // si no tiene token no consulta los productos
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }

    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);
    let id_user;

    //si el token no pasa la verificacion no se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      id_user = tokenData.idIser;
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }

    // Conexión a la base de datos
    const connection = await getConnection();

    const textConsult = `SELECT us.id FROM user us WHERE us.id = '${id_user}'`;
    const resultConsultUser = await connection.query(textConsult);
    //paso #1 verifica si hay un usuario con el id
    if (resultConsultUser && resultConsultUser.length < 1) {
      return res.json("Usuario no encontrado");
    }

    // Verificar si ya existe un registro con el mismo usuario y producto
    const existingRecord = await connection.query(
      "SELECT * FROM shopping_cart WHERE id_product = ? AND id_user = ?",
      [id_product, id_user]
    );

    if (existingRecord.length < 1) {
      // Si no existe un registro, inserta uno nuevo
      const newRecord = { id_product, id_user, amount };
      await connection.query("INSERT INTO shopping_cart SET ?", newRecord);
      res.json("Producto Agregado Con Exito");
    } else {
      res.json("Producto ya existe en el carrito");
    }
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

export const methods = {
  getListCar,
  addCar,
  verificarCar,
};
