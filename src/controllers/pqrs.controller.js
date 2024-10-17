import { getConnection } from "../database/database.js";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { resen } from "../controllers/resendEmail.js";

import iconv from "iconv-lite";
import fs from "fs";
import { cloudflareMiddleware } from "./../middleware/save-file-cloudflare.js";
import config from "./../config.js";

const getPqrs = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      `SELECT * FROM type_pqrs tp WHERE tp.id_state=2`
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const getPqrsUser = async (req, res) => {
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
        `SELECT p.* ,st.names_state,tp.name_type FROM pqrs p 
          LEFT JOIN state st ON p.id_state = st.id
          LEFT JOIN type_pqrs tp ON p.id_type_pqrs = tp.id_type_pqrs
          WHERE p.id_user  = ${id_user}`
      );
      res.json(result);
    } else {
      return res.json("Token modificado o vencido");
    }
  } catch (error) {
    res.status;
    res.send(error.message);
  }
};

const addPqrs = async (req, res) => {
  try {
    const { detalleTramite, tipoSolicitud } = req.body;

    const fileSolicitud = req.files;

    // si no tiene token no realiza nada
    if (!req.headers.authorization) {
      return;
    }
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);

    //si el token no pasa la verificacion no se continua con el proceso
    if (tokenData) {
      //conexion a la DB
      const connetion = await getConnection();

      const id_user = tokenData.idIser;
      const result = await connetion.query(
        `SELECT id,names,last_name,mail FROM user WHERE user.id=${id_user}`
      );

      if (!result[0]) {
        return res.json("Usuario no encontrado");
      }
      const idUsuario = result[0].id;
      const mail = result[0].mail;
      const names = result[0].names;
      const last_name = result[0].last_name;
      const lowerCaseMail = mail.toLowerCase();

      //3-2024-00001 (id tipo solicitud-año-numero consecutivo)
      const resultPqrs = await connetion.query(
        `SELECT *
          FROM pqrs
          ORDER BY date_register DESC
          LIMIT 1;    `
      );
      const numRadicadoOld = parseInt(resultPqrs[0].radicado.split("-")[2]);
      const fecha = new Date();

      const newNumRadicado = `${tipoSolicitud}-${fecha.getFullYear()}-${String(
        numRadicadoOld + 1
      ).padStart(6, "0")}`;

      console.log("Nuevo fileSolicitud", fileSolicitud[0]);
      const savedPaths = await saveimgCloudFlare(
        fileSolicitud[0],
        newNumRadicado
      );

      console.log("Imagen guardada en el servidor", savedPaths);
      const query = `INSERT INTO pqrs (radicado, id_user, id_type_pqrs, process_detail, url_file, id_state)
         VALUES ('${newNumRadicado}','${idUsuario}','${tipoSolicitud}','${detalleTramite}','${savedPaths}',7);`;

      const resultInsert = await connetion.query(query);

      if (!resultInsert) {
        return res.json("Error al registrar la pqrs");
      } else {
        resen.sendEmailpqrs(
          lowerCaseMail.trim(),
          `${names} ${last_name}`,
          newNumRadicado
        );

        res.json("Pqrs Registrado: " + newNumRadicado);
      }
    } else {
      return res.json("Token modificado o vencido");
    }
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

async function saveimgCloudFlare(files, newNumRadicado) {
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
    const filePath = `filePqrs/${newNumRadicado}/${decodedFilename}`;
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
      const savedPathsFin = `${config.rutaR2}/${filePath}`;
      savedPaths = savedPathsFin;
    } catch (error) {
      throw error;
    }
  }
  return savedPaths;
}

export const methods = {
  getPqrs,
  addPqrs,
  getPqrsUser,
};
