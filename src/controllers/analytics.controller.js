import { getConnection } from "../database/database.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { resen } from "../controllers/resendEmail.js";

const getListOrdes = async (req, res) => {
  try {
    // si no tiene token no pasa
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }
    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);
    let id_user;

    //si el token  pasa la verificacion se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `SELECT 
          bll.id, 
          number_bill, 
          bll.date_register, 
          st_p.names_state AS pago, 
          st_d.names_state AS delivery,  
          CONCAT(us.names, ' ', us.last_name) AS userComprador, 
          tc.names_card,
          CONCAT(name_buyer, ' ', last_name_buyer) AS nombre,
          card_buyer,
          phone_buyer,
          mail_buyer,
          ct.name_city AS city,
          address_delivery,
          bll.type_pay,
          bll.shipments,
          bll.payment_reference,
          sl.obs_venta,d.names_department,bll.delivery_reference,sl.id_user,tc.id as type_identity,d.id as id_depart,ct.id as id_city,
         
              CONCAT(
                  '[', 
                  GROUP_CONCAT(
                      CONCAT(
                          '{'
                          '"nombre_producto":', '"', p.product_name, '",',                
                          '"cantidad":',ps.amount,',',
                          '"precio":',ps.product_price,',',
                          '"stock":', p.stock,
                          '}'
                      ) 
                      ORDER BY ps.amount ASC 
                      SEPARATOR ', '
                  ),
                  ']'
              ) AS list_productos
            FROM 
                billing bll
            LEFT JOIN city ct ON ct.id = bll.delivery_city
            LEFT JOIN sale sl ON sl.id_billing = bll.id
            LEFT JOIN  user us ON us.id = sl.id_user
            LEFT JOIN state st_p ON st_p.id = sl.id_state
            LEFT JOIN  state st_d ON st_d.id = sl.id_state_delivery
            LEFT JOIN type_card tc ON tc.id = bll.id_type_card
            LEFT JOIN products_sale ps ON sl.id = ps.id_sale 
            LEFT JOIN product p ON ps.id_product = p.id
            LEFT JOIN department d ON d.id = bll.delivery_department
            
            GROUP BY 
                bll.id, 
                sl.id
            ORDER BY 
                bll.date_register DESC
            LIMIT 3000;
`
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

const createOrder = async (req, res) => {
  try {
    // si no tiene token no pasa
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }
    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);

    //si el token  pasa la verificacion se continua con el proceso
    if (tokenData) {
      //obtener data del body

      const {
        id_user,
        Nombres,
        Apellidos,
        Email,
        Telefono,
        TipDocumento,
        NumDocumento,
        Departamento,
        Ciudad,
        Direccion,
        Referencia,
        type_pay,
        valorEnvio,
        productos,
      } = req.body;
      let amount = productos.reduce((acc, item) => acc + item.quantity, 0);
      let totalPago = productos.reduce((acc, item) => acc + item.sale_price, 0);
      const connetion = await getConnection();

      //insertar en la tabla billing(facturacion)
      const idBilling = await connetion.query(
        `INSERT INTO billing 
          (id,number_bill, name_buyer, last_name_buyer, mail_buyer,card_buyer, phone_buyer,
           address_delivery, type_pay, shipments, id_type_card, delivery_department,
            delivery_city, delivery_reference)
            VALUES (NULL, '','${Nombres}', '${Apellidos}','${Email}', '${NumDocumento}', '${Telefono}',
            '${Direccion}','${type_pay}','${valorEnvio}', '${TipDocumento}', '${Departamento}', 
            '${Ciudad}','${Referencia}')`
      );

      //insertar en la tabla sale(venta
      const idSale = await connetion.query(`
            INSERT INTO sale (id, id_user, id_billing, amount, id_state, id_state_delivery, obs_venta) 
            VALUES (NULL, '${id_user}', '${idBilling.insertId}', '${amount}', '19', '12', 'pago al recibir')`);

      //insertar en la tabla sale_product(productos de la venta)
      for (let i = 0; i < productos.length; i++) {
        const id = await connetion.query(`
          INSERT INTO products_sale (id, id_product, id_sale, amount, product_price, iva) 
          VALUES (NULL, '${productos[i].product_id}', '${idSale.insertId}', '${productos[i].quantity}', '${productos[i].sale_price}', '0')`);

        //  actualizar el stock de los productos
        const stock = await connetion.query(`
          UPDATE product SET stock = stock - ${productos[i].quantity} WHERE id = ${productos[i].product_id}`);
      }
      const pagoTotal = parseInt(totalPago) + parseInt(valorEnvio);
      resen.sendEmailConfCompra(
        Email,
        `${Nombres} ${Apellidos}`,
        type_pay,
        idBilling.insertId,
        pagoTotal,
        Direccion
      );

      res.json("Orden creada correctamente");
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    res.send(error.message);
  }
};

const ordenEntregada = async (req, res) => {
  try {
    // si no tiene token no pasa
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }
    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);

    const { idOrden } = req.body;
    //si el token  pasa la verificacion se continua con el proceso
    const dateEntrega = new Date();
    dateEntrega.setHours(dateEntrega.getHours() - 5); // Ajustar la hora a GMT-5

    const formattedDate = dateEntrega
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    if (tokenData) {
      //obtener el id del usuario
      const connetion = await getConnection();
      const result = await connetion.query(
        `UPDATE sale SET id_state_delivery  = 14,id_state=4,date_confirmed_delivery='${formattedDate}'  WHERE id_billing = ${idOrden}`
      );
      res.json("Orden Actualizada");
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

export const methods = {
  getListOrdes,
  createOrder,
  ordenEntregada,
};
