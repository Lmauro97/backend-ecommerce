import { getConnection } from "../database/database.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { resen } from "../controllers/resendEmail.js";
import bcrypt from "bcrypt";
import iconv from "iconv-lite";
import fs from "fs";
import config from "./../config.js";
import { cloudflareMiddleware } from "./../middleware/save-file-cloudflare.js";

const getListUser = async (req, res) => {
  try {
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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `SELECT us.id, us.photo, us.names, us.last_name,us.mail,us.phone, us.identification_card,
         tpc.names_card as tipo_identificacion, us.address, dpt.names_department, cty.name_city,st.names_state as estado,
         us.terminos_condicion,us.last_login,us.date_register,us.obsLowSuscripcion,
         GROUP_CONCAT(role.name_role) AS roles
              FROM 
                  user us
              LEFT JOIN 
                  type_card tpc ON us.id_type_card = tpc.id
              LEFT JOIN 
                  department dpt ON us.id_department = dpt.id
              LEFT JOIN 
                  city cty ON us.id_city = cty.id
              LEFT JOIN 
                  state st ON us.id_state = st.id
              LEFT JOIN 
                  profiles prf ON us.id = prf.id_user
              LEFT JOIN 
                  role ON role.id = prf.id_rol
             
              GROUP BY 
                  us.id;`
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

const getUser = async (req, res) => {
  try {
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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `SELECT us.id, us.photo, us.names, us.last_name,us.mail,us.phone, us.identification_card,
         tpc.names_card as tipo_identificacion, us.address, dpt.names_department, cty.name_city,st.names_state as estado,
         GROUP_CONCAT(role.name_role) AS roles
              FROM 
                  user us
              LEFT JOIN 
                  type_card tpc ON us.id_type_card = tpc.id
              LEFT JOIN 
                  department dpt ON us.id_department = dpt.id
              LEFT JOIN 
                  city cty ON us.id_city = cty.id
              LEFT JOIN 
                  state st ON us.id_state = st.id
              LEFT JOIN 
                  profiles prf ON us.id = prf.id_user
              LEFT JOIN 
                  role ON role.id = prf.id_rol
              WHERE 
                  us.id = ${id_user}
              GROUP BY 
                  us.id;`
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

const getUserPerfil = async (req, res) => {
  try {
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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query("SELECT * FROM user");
      res.json(result);
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const addUser = async (req, res) => {
  try {
    const {
      names,
      last_name,
      mail,
      phone,
      identification_card,
      id_type_card,
      id_department,
      address,
      id_city,
      terminos_condicion,
    } = req.body;

    const fotoUsuario = req.files;
    //console.log(req.body);
    const pass = generarpassword();
    const passEncriptada = bcrypt.hashSync(pass, 12); ///encripta la contraseña
    const body = {
      names: names,
      last_name: last_name,
      mail: mail,
      phone: phone,
      identification_card: identification_card,
      id_type_card: id_type_card,
      id_department: id_department,
      address: address,
      id_city: id_city,
      password: passEncriptada,
      terminos_condicion: terminos_condicion ? 1 : 0,
      id_state: 2,
    };
    //conexion a la DB
    const connetion = await getConnection();

    const result = await connetion.query(
      `SELECT * FROM user WHERE user.mail='${mail}'`
    );
    const resultPhone = await connetion.query(
      `SELECT * FROM user WHERE user.phone='${phone}'`
    );
    const resultDocument = await connetion.query(
      `SELECT * FROM user WHERE user.identification_card='${identification_card}'`
    );

    // verifica si hay un usuario con este correo
    if (result && result.length > 0) {
      res.json("Ya existe un usuario con este correo registrado.");
      result;
    }
    // verifica si hay un usuario con este documento
    else if (resultDocument && resultDocument.length > 0) {
      res.json("Ya existe un usuario con este documento registrado.");
      result;
    }
    // verifica si hay un usuario con este telefono
    else if (resultPhone && resultPhone.length > 0) {
      res.json("Ya existe un usuario con este teléfono registrado.");
      result;
    } else {
      const resultInsert = await connetion.query(
        "INSERT INTO`user` SET ?",
        body
      );
      const idUsuario = resultInsert.insertId;
      const lowerCaseMail = mail.toLowerCase();
      resen.sendEmail(lowerCaseMail.trim(), `${names} ${last_name}`, pass);

      // const savedPaths = saveimg(fotoUsuario[0], idUsuario);
      saveimgCloudFlare(fotoUsuario[0], idUsuario);
      addFirstPerfilUser(idUsuario);
      // Eliminar archivos temporales
      fotoUsuario.forEach((file) => {
        console.log("ok");
        fs.unlinkSync(file.path);
      });
      res.json("Usuario Registrado");
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    res.send(error.message);
  }
};

// ****asigna el primer perfil al usuario******
async function addFirstPerfilUser(idUser) {
  const textQuery = `INSERT INTO profiles(id, id_user, id_rol) VALUES (null,${idUser},2)`;
  //conexion a la DB
  const connetion = await getConnection();
  const result = await connetion.query(textQuery);
}

// Función para generar una contraseña aleatoria
function generarpassword() {
  // Definimos los caracteres permitidos para la contraseña
  const caracteres =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_-+=";

  // Inicializamos la variable que almacenará la contraseña
  let password = "";

  // Iteramos para construir la contraseña de la longitud deseada
  for (let i = 0; i < 12; i++) {
    // Generamos un índice aleatorio para seleccionar un carácter de la cadena
    const indiceAleatorio = Math.floor(Math.random() * caracteres.length);
    // Concatenamos el carácter aleatorio a la contraseña
    password += caracteres.charAt(indiceAleatorio);
  }
  // Devolvemos la contraseña generada
  return password;
}

// ////renombrar imagenes
// function saveimg(files, idUsuario) {
//   if (!Array.isArray(files)) {
//     // If only one file is provided, convert it to an array for consistency
//     files = [files];
//   }

//   const folderPath = `./fotosUsuarios/${idUsuario}`;

//   /// Si la carpeta no existe, créala
//   if (!fs.existsSync(folderPath)) {
//     fs.mkdirSync(folderPath, { recursive: true });
//   }

//   let savedPaths = "";

//   files.forEach((file) => {
//     //// Decodifica el nombre del archivo para manejar caracteres especiales
//     const decodedFilename = iconv.decode(
//       Buffer.from(file.originalname, "binary"),
//       "utf-8"
//     );

//     const newpath = `${folderPath}/${decodedFilename}`;
//     fs.renameSync(file.path, newpath);

//     // Almacena la ruta guardada
//     savedPaths = newpath;
//   });

//   // Return the array of saved paths
//   return savedPaths;
// }

async function saveimgCloudFlare(files, idUsuario) {
  if (!Array.isArray(files)) {
    // Si solo se proporciona un archivo, conviértelo en una matriz por consistencia
    files = [files];
  }

  let savedPaths = [];

  for (const file of files) {
    // Decodifica el nombre del archivo para manejar caracteres especiales
    const decodedFilename = iconv.decode(
      Buffer.from(file.originalname, "binary"),
      "utf-8"
    );

    // Lee el archivo
    const fileData = await fs.promises.readFile(file.path);

    // Define la ruta en R2
    const filePath = `fotosUsuarios/${idUsuario}/${decodedFilename}`;
    try {
      // Sube el archivo a R2
      const params = {
        Bucket: config.bucket_name, // Nombre del bucket
        Key: filePath,
        Body: fileData,
        ContentType: file.mimetype, // Asegurar el tipo de contenido correcto
      };
      await cloudflareMiddleware.s3.putObject(params).promise();

      // Almacena la ruta guardada
      savedPaths.push(filePath);
      const savedPathsFin = `${config.rutaR2}/${savedPaths}`;
      addRutasImg(savedPathsFin, idUsuario);
      console.log("Imagen guardada en R2");
    } catch (error) {
      throw error;
    }
  }
  return;
}

///guarda rutas en la DB
// async function addRutasImg(rutas, idUsuario, req) {
//   const connetion = await getConnection();

//   const serverAddress = req.headers.host;

//   const relativePath = rutas.replace("./fotosUsuarios", "");
//   const completeUrl = `http://${serverAddress}${relativePath}`;
//   const resultInsert = await connetion.query(
//     `UPDATE user SET photo = '${completeUrl}' WHERE user.id = ${idUsuario}`
//   );

//   return;
// }

async function addRutasImg(rutas, idUsuario) {
  const connection = await getConnection();
  // Actualizar la base de datos con la URL completa
  const resultInsert = await connection.query(
    `UPDATE user SET photo = '${rutas}' WHERE user.id = ${idUsuario}`
  );
  return;
}

//Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { names, last_name, id_department, address, id_city } = req.body;

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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `UPDATE user SET names = '${names}', last_name = '${last_name}', id_department = ${id_department}, 
         address = '${address}', id_city = ${id_city} WHERE user.id = ${id_user}`
      );
      res.json("Los datos se han actualizado correctamente");
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

// //Anular suscripcion
const lowSuscripcion = async (req, res) => {
  try {
    const obsLowSuscripcion = req.body;

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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `UPDATE user SET id_state = '10', obsLowSuscripcion = '${obsLowSuscripcion}' WHERE user.id = ${id_user}`
      );
      res.json("La suscripción se ha anulado correctamente");
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

//actualizar foto usuario
const updateFoto = async (req, res) => {
  try {
    const fotoUsuario = req.files;
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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      await saveimgCloudFlare(fotoUsuario[0], id_user);
      // Eliminar archivos temporales
      fotoUsuario.forEach((file) => {
        fs.unlinkSync(file.path);
      });
      res.json("Foto actualizada correctamente");
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

//obtener compras del usuario
const getUserCompras = async (req, res) => {
  try {
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
      //obtener el id del usuario
      id_user = tokenData.idIser;
      const connetion = await getConnection();
      const result = await connetion.query(
        `SELECT sl.*, bll.*,ps.*,st.names_state as estado_entrega,st2.names_state as estado_pago,GROUP_CONCAT(p.main_photo) as fotos_producto,p.product_name FROM sale sl 
          LEFT JOIN  state st ON sl.id_state_delivery = st.id        
          LEFT JOIN  state st2 ON sl.id_state = st2.id
          LEFT JOIN  billing bll ON sl.id_billing = bll.id  
          LEFT JOIN  products_sale ps ON sl.id = ps.id_sale 
          LEFT JOIN  user us ON sl.id_user = us.id       
          LEFT JOIN product p ON ps.id_product = p.id
          WHERE sl.id_user = ${id_user} GROUP BY 
          sl.id, 
          bll.id, 
          ps.id
          `
      );
      res.json(result);
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

//obtener facturas del usuario
const getUserFacturas = async (req, res) => {
  try {
    // Si no tiene token, no consulta los productos
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }

    // Obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);
    let id_user;

    // Si el token pasa la verificación, se continúa con el proceso
    if (tokenData) {
      // Obtener el id del usuario
      id_user = tokenData.idIser;
      const connection = await getConnection();
      const result = await connection.query(
        `SELECT 
              sl.id AS id_venta,
              bll.number_bill,
              CONCAT(bll.name_buyer, ' ', bll.last_name_buyer) AS nombres,
              bll.card_buyer,
              bll.mail_buyer,
              bll.phone_buyer,
              bll.address_delivery,
              dpt.names_department as  delivery_department,
              ct.name_city as delivery_city,
              bll.payment_reference,
              bll.type_pay,
              bll.shipments,
              tyc.names_card,
              sl.amount,
              st_p.names_state AS estado_pago,
              st_entrega.names_state AS estado_entrega,
              sl.date_register,
              sl.date_confirmed_delivery,
              sl.date_return,
              sl.obs_venta,
              CONCAT(
                  '[', 
                  GROUP_CONCAT(
                      CONCAT(
                          '{',
                          '"id_producto":', '"', pd.code, '",', 
                          '"nombre_producto":', '"', pd.product_name, '",',                
                          '"cantidad":',ps.amount,',',
                          '"precio":',ps.product_price,',',
                          '"iva":', ps.iva,
                          '}'
                      ) 
                      ORDER BY ps.amount ASC 
                      SEPARATOR ', '
                  ),
                  ']'
              ) AS productos
          FROM 
              sale sl
          LEFT JOIN 
              billing bll ON sl.id_billing = bll.id
          LEFT JOIN 
              products_sale ps ON ps.id_sale = sl.id
          LEFT JOIN 
              product pd ON pd.id = ps.id_product
          LEFT JOIN 
              state st_p ON st_p.id = sl.id_state
          LEFT JOIN 
              state st_entrega ON st_entrega.id = sl.id_state_delivery
          LEFT JOIN 
              type_card tyc ON tyc.id= bll.id_type_card
          LEFT JOIN 
              department dpt ON dpt.id=bll.delivery_department
          LEFT JOIN 
              city ct ON ct.id=bll.delivery_city
          WHERE 
              sl.id_user = ${id_user}
          GROUP BY 
              sl.id, bll.number_bill, bll.name_buyer, bll.last_name_buyer, bll.card_buyer, bll.mail_buyer, bll.phone_buyer, 
              bll.address_delivery, bll.delivery_department, bll.delivery_city, bll.payment_reference, bll.type_pay, 
              bll.shipments, bll.id_type_card, sl.amount, sl.id_state, sl.id_state_delivery, sl.date_register, 
              sl.date_confirmed_delivery, sl.date_return, sl.obs_venta`
      );

      // Parsear la columna "productos" para convertirla en un array
      const parsedResult = result.map((row) => {
        return {
          ...row,
          productos: JSON.parse(row.productos),
        };
      });

      res.json(parsedResult);
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

export const methods = {
  getListUser,
  getUser,
  addUser,
  getUserPerfil,
  updateUser,
  lowSuscripcion,
  updateFoto,
  getUserCompras,
  getUserFacturas,
};
