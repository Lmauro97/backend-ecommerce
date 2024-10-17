import { MercadoPagoConfig } from "mercadopago";

import { Preference, Payment } from "mercadopago";
import { getConnection } from "../database/database.js";
import config from "./../config.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import moment from "moment-timezone";
import { resen } from "../controllers/resendEmail.js";

// Agrega credenciales
const client = new MercadoPagoConfig({
  accessToken: config.accessToken,
});

///metodo de pago mercado pago
const pagar = async (req, res) => {
  // si no tiene token no consulta los productos
  if (!req.headers.authorization) {
    return res.json("Debes iniciar sesión nuevamente");
  }

  //obtener el token
  const token = req.headers.authorization.split(" ").pop();
  const tokenData = await authMiddleware.verifyToken(token);
  let id_user;

  //si el token  pasa la verificacion se continua con el proceso
  if (tokenData) {
    id_user = tokenData.idIser;
  } else {
    return res.json("Debes iniciar sesión nuevamente");
  }

  const idusuario = id_user;
  const name_buyer = req.body.datosFacturacion.nombre;
  const last_name_buyer = req.body.datosFacturacion.apellido;
  const card_buyer = req.body.datosFacturacion.numDocumento;
  const mail_buyer = req.body.datosFacturacion.email;
  const phone_buyer = req.body.datosFacturacion.telefono;
  const address_delivery = req.body.datosFacturacion.direccion;
  const type_pay = req.body.datosFacturacion.metodoPago;
  const id_type_card = req.body.datosFacturacion.TipDocumento;
  const delivery_department = req.body.datosFacturacion.departamento;
  const delivery_city = req.body.datosFacturacion.ciudad;
  const payment_reference = null;
  const delivery_reference = req.body.datosFacturacion.refencia;
  const totalEnvio = req.body.datosFacturacion.totalEnvio;

  const queryText = `INSERT INTO billing (number_bill,name_buyer,last_name_buyer,card_buyer,mail_buyer,phone_buyer,address_delivery,type_pay,id_type_card,delivery_department,delivery_city,payment_reference,delivery_reference,shipments)	VALUES ('','${name_buyer}','${last_name_buyer}',${card_buyer},'${mail_buyer}',${phone_buyer},'${address_delivery}','${type_pay}',${id_type_card},${delivery_department},${delivery_city},${payment_reference},'${delivery_reference}',${totalEnvio})`;

  // segunda validacion del usuario
  if (!idusuario) {
    return res.json("Debes iniciar sesión nuevamente");
  }
  //obtener los productos del carrito
  const listItems = await getListCar(idusuario);

  const items = listItems.map((item) => {
    return {
      sku: item.code,
      title: item.product_name,
      unit_price:
        item.on_promocion == 1 ? item.promotion_price : item.sale_price,
      quantity: item.amount,
      id: item.id_product,
      description: item.product_name,
    };
  });
  // console.log("items", items);

  //verificar que venga almenos un producto en el carrito
  if (items.length === 0) {
    return res.json("No hay productos en el carrito");
  }

  //verificar que no venga producto con cantidad 0
  const cantidadCero = items.filter((item) => item.quantity === 0);
  if (cantidadCero.length > 0) {
    return res.json("No se puede comprar productos con cantidad 0");
  }
  //conectar a la base de datos
  const connetion = await getConnection();

  //validar que no vengan productos sin stock en la tabla product
  const queryTextStock = `SELECT id,stock,product_name FROM product WHERE id IN (${items
    .map((item) => item.id)
    .join(",")})`;
  let productsWithoutStock;
  const queryStock = await connetion
    .query(queryTextStock)
    .then((resultQuery) => {
      productsWithoutStock = items.filter((item) => {
        const product = resultQuery.find((product) => product.id === item.id);
        return product.stock < item.quantity;
      });
    });

  if (productsWithoutStock.length > 0) {
    return res.json(
      "Lamentamos informarle que el producto: " +
        productsWithoutStock[0].title +
        " se ha quedado sin stock. Por favor, elimínelo del carrito antes de continuar con su compra. Gracias por su comprensión."
    );
  }
  const preference = new Preference(client);

  if (req.body.datosFacturacion.metodoPago === "mercadoPago") {
    //realiza la inserción de los datos de facturacion en la tabla billing
    let lastInsertId;
    const query = connetion.query(queryText).then((resultQuery) => {
      // Obtener el ID del registro recién insertado de la tabla billing
      lastInsertId = resultQuery.insertId;

      const TotalProduct = items.reduce((acc, item) => acc + item.quantity, 0);
      const bodySale = {
        idUser: idusuario,
        idBilling: lastInsertId,
        amount: TotalProduct,
        id_state: 6,
      };
      insertSale(bodySale, items); //inserta la venta
      // Establece la zona horaria a Bogotá
      const currentDate = moment().tz("America/Bogota");
      const expirationDateFrom = currentDate.clone().subtract(5, "hours");
      const expirationDate = currentDate.clone().add(19, "hours");

      preference
        .create({
          body: {
            items: items,
            taxes: [
              {
                value: 500,
                type: "IVA",
              },
            ],
            payer: {
              name: name_buyer,
              surname: last_name_buyer,
              email: mail_buyer,
              phone: {
                area_code: "57",
                number: phone_buyer,
              },
              identification: {
                type: "CC",
                number: card_buyer,
              },
            },
            shipments: {
              cost: totalEnvio,
            },
            //rutas de redireccionamiento
            //iniciar →→→ ngrok http http://localhost:3000
            back_urls: {
              success: `${config.urlfrontend}/checkout/payment`,
              failure: `${config.urlfrontend}/checkout/payment`,
              pending: `${config.urlfrontend}/checkout/payment`,
            },
            notification_url: `${config.notification_url}/pagarproduct/getReference/${lastInsertId}`,
            expires: true,
            expiration_date_from: expirationDateFrom.toISOString(),
            expiration_date_to: expirationDate.toISOString(),
            statement_descriptor: "Compratodo Online",
          },
        })
        .then(function (response) {
          // console.log("respuesta------------", response);
          const respuesta = {
            url: response.init_point,
          };
          clearCart(idusuario); //limpia el carrito

          res.json(respuesta);
        })
        .catch(console.log("terminado"));
    });
  } else if (req.body.datosFacturacion.metodoPago === "contraentrega") {
    //realisa la insercion de los datos de facturacion
    const query = connetion.query(queryText).then((resultQuery) => {
      // Obtener el ID del registro recién insertado
      const lastInsertId = resultQuery.insertId;
      const respuesta = {
        idBilling: lastInsertId,
        sms: "¡Pedido confirmado! El pago deberá realizarse en efectivo al momento de la entrega. ¡Gracias por tu compra!",
      };
      const TotalProduct = items.reduce((acc, item) => acc + item.quantity, 0);
      const bodySale = {
        idUser: idusuario,
        idBilling: lastInsertId,
        amount: TotalProduct,
        id_state: 19,
      };
      insertSale(bodySale, items); //inserta la venta
      clearCart(idusuario); //limpia el carrito
      updateStock(lastInsertId); //actualiza el stock

      const TotalPago = items.reduce((acc, item) => acc + item.unit_price, 0);
      resen.sendEmailConfCompra(
        mail_buyer,
        `${name_buyer} ${last_name_buyer}`,
        "Contraentrega",
        lastInsertId,
        TotalPago + totalEnvio,
        address_delivery
      );
      res.json(respuesta);
    });
  } else {
    const respuesta = {
      idBilling: "",
      sms: "Pago Pendiente De Confirmación",
    };
    res.json(respuesta);
  }
};

//inserta la venta y los productos de la venta
async function insertSale(body, pruducts) {
  const connetion = await getConnection();
  const queryText = `INSERT INTO sale (id_user,id_billing,amount,id_state,id_state_delivery)
	VALUES (${body.idUser},${body.idBilling},${body.amount},${body.id_state},11)`;

  //realisa la insercion de la venta en la tabla sale
  const query = connetion.query(queryText).then((resultQuery) => {
    // Obtener el ID del registro recién insertado
    const lastInsertId = resultQuery.insertId;

    //inserta los productos de la venta a la tabla products_sale
    pruducts.forEach((element) => {
      const queryTextSale = `INSERT INTO products_sale (id_product,id_sale,amount,product_price,iva)
      VALUES (${element.id},${lastInsertId},${element.quantity},${element.unit_price},0)`;
      const query = connetion.query(queryTextSale).then((resultQuery) => {});
    });
  });
}

//lista de productos del carrito por usuario
async function getListCar(id_user) {
  const connetion = await getConnection();
  const result = await connetion.query(
    `SELECT sh.*,pt.product_name ,pt.main_photo,pt.sale_price,pt.code,pt.promotion_price,pt.on_promocion,pt.stock,pt.description  FROM shopping_cart sh INNER JOIN product pt ON sh.id_product  = pt.id WHERE sh.id_user = ${id_user}`
  );
  return result;
}

const getReference = async (req, res) => {
  try {
    const { query } = req;
    const topic = query.topic || query.type;
    const { idBilling } = req.params;
    const connetion = await getConnection();

    let nombre;
    let correo;
    let direccion;
    // realiza otra consulta para obtener los datos del comprador y enviar el correo
    const selectQueryText = `SELECT name_buyer, last_name_buyer, mail_buyer, address_delivery FROM billing WHERE id = ${idBilling}`;
    const selectQuery = await connetion
      .query(selectQueryText)
      .then((resultSelectQuery) => {
        nombre = `${resultSelectQuery[0].name_buyer} ${resultSelectQuery[0].last_name_buyer}`;
        correo = resultSelectQuery[0].mail_buyer;
        direccion = resultSelectQuery[0].address_delivery;
      });

    if (topic === "payment") {
      const id = query["data.id"] || query.id;
      const payment = new Payment(client);
      payment
        .get({
          id: id,
        })
        .then(async function (response) {
          //console.log("respuesta", response);
          const { status } = response;
          const queryText = `UPDATE billing SET payment_reference = '${id}' WHERE id = ${idBilling}`;

          //consultar si ya se habia actualizado el payment_reference en la tabla billing
          const queryTextSelect = `SELECT payment_reference FROM billing WHERE payment_reference = ${id}`;

          const querySelect = await connetion.query(queryTextSelect);

          // Realiza la actualización de la factura con el id del pago
          const query = connetion.query(queryText).then((resultQuery) => {});

          //actualiza el estado de la venta segun el estado del pago
          if (status === "approved") {
            if (querySelect[0] && querySelect[0].payment_reference === id) {
              return res.status(200).send("OK");
            }
            const queryTextSale = `UPDATE sale SET id_state = 4, id_state_delivery = 11 WHERE id_billing = ${idBilling}`;
            try {
              const resultQuery = connetion.query(queryTextSale);
              updateStock(idBilling); //actualiza el stock
              let totalPaidAmount =
                response.transaction_details.total_paid_amount;
              resen.sendEmailConfCompra(
                correo,
                nombre,
                "Aprobado",
                id,
                totalPaidAmount,
                direccion
              );

              return res.status(200).send("OK");
            } catch (error) {
              return res.status(500).send(error);
            }
          } else if (status === "rejected") {
            if (querySelect[0] && querySelect[0].payment_reference === id) {
              return res.status(200).send("OK");
            }

            const queryTextSale = `UPDATE sale SET id_state = 5, id_state_delivery =17  WHERE id_billing = ${idBilling}`;
            try {
              const resultQuery = connetion.query(queryTextSale);
              console.log("correo", correo);
              resen.sendEmailConfCompra(
                correo,
                nombre,
                "Rechazado",
                id,
                0,
                "No aplica"
              );
              return res.status(200).send("OK");
            } catch (error) {
              return res.status(500).send(error);
            }
          } else if (status === "in_process") {
            if (querySelect[0] && querySelect[0].payment_reference === id) {
              return res.status(200).send("OK");
            }

            const queryTextSale = `UPDATE sale SET id_state = 6 , id_state_delivery = 18 WHERE id_billing = ${idBilling}`;
            try {
              const resultQuery = connetion.query(queryTextSale);
              resen.sendEmailConfCompra(
                correo,
                nombre,
                "En proceso",
                id,
                0,
                "No aplica"
              );
              return res.status(200).send("OK");
            } catch (error) {
              return res.status(500).send(error);
            }
          }
        })
        .catch(console.log);
    }
  } catch (error) {
    console.error("Error al obtener los datos del pago:", error);
    res.status(500).send("Error al obtener los datos del pago");
  }
};

//limpiar carrito despues de la compra
const clearCart = async (id_user) => {
  const connetion = await getConnection();
  const queryText = `DELETE FROM shopping_cart  WHERE id_user = ${id_user}`;
  const query = connetion.query(queryText).then((resultQuery) => {});
};

//actualizar el stock de los productos
const updateStock = async (idBilling) => {
  const connetion = await getConnection();
  const queryText = `SELECT id FROM sale WHERE id_billing = ${idBilling}`;
  const query = connetion.query(queryText).then((resultQuery) => {
    const idSale = resultQuery[0].id;

    const queryText2 = `SELECT id_product,amount FROM products_sale WHERE id_sale=${idSale}`;

    const query = connetion.query(queryText2).then((resultQuery) => {
      resultQuery.forEach((element) => {
        const queryText3 = `UPDATE product SET stock = stock - ${element.amount} WHERE id = ${element.id_product}`;
        const query = connetion.query(queryText3).then((resultQuery) => {});
      });
    });
  });
};

export const methods = {
  pagar,
  getReference,
};
