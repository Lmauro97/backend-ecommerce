import { getConnection } from "../database/database.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import config from "./../config.js";
import { resen } from "./resendEmail.js";
import moment from "moment-timezone";

const authLogin = async (req, res) => {
  try {
    const { correo, pass } = req.body;
    const connetion = await getConnection();
    const textConsult = `SELECT us.id,us.names,us.last_name,us.last_login, us.mail, us.password, us.id_state,GROUP_CONCAT(role.name_role) AS roles FROM user us 
                        LEFT JOIN profiles prf ON us.id = prf.id_user
                        LEFT JOIN role ON role.id = prf.id_rol WHERE us.mail = '${correo}'`;
    const result = await connetion.query(textConsult);

    //paso #1 verifica si hay un susuario con ese correo
    if (result && result.length > 0) {
      // Accede a la primera instancia de RowDataPacket en el array
      const firstRowDataPacket = result[0];
      // Accede a las propiedades mail, password, y id_state y guárdalas en variables

      const mail = firstRowDataPacket.mail;
      const password = firstRowDataPacket.password;
      const id_state = firstRowDataPacket.id_state;
      //paso #2 verifica si el usuario esta activo en la plataforma
      if (id_state != 2) {
        return res.json(
          `La cuenta de este usuario no está activa en este momento. 
           Le solicitamos amablemente que se comunique con nuestro equipo
           de soporte para recibir asistencia y reactivar su cuenta.
           Muchas gracias`
        );
      }
      ///paso #3 compara la contraseña reciubida con la del usuario guardada en la DB
      const resultVerificacion = bcrypt.compareSync(pass, password);
      if (resultVerificacion) {
        //paso #4 generación del token
        const token = generateToken(firstRowDataPacket);
        // actualizar la fecha de último login
        const getCurrentBogotaTime = () => {
          return moment.tz("America/Bogota").format("YYYY-MM-DD HH:mm:ss");
        };

        const updateLastLogin = `UPDATE user SET last_login = '${getCurrentBogotaTime()}' WHERE mail = '${mail}'`;

        await connetion.query(updateLastLogin);

        //RETORNA EL TOKEN
        return res.json({
          success: "Login Exitoso!",
          token: token,
        });
      } else {
        return res.json("Contraseña errada");
      }
    } else {
      res.json("No se encontró un usuario con este correo");
    }
  } catch (error) {
    res.status(500);
    res.json("Error al intentar loguearse");
  }
};

const rememberPass = async (req, res) => {
  try {
    const { email } = req.body;
    const connetion = await getConnection();
    const textConsult = `SELECT mail,id_state,names,last_name FROM user WHERE  mail ='${email.toLowerCase()}'`;
    console.log(textConsult);
    const result = await connetion.query(textConsult);

    //paso #1 verifica si hay un usuario con ese correo
    if (result && result.length > 0) {
      // Accede a la primera instancia de RowDataPacket en el array
      const firstRowDataPacket = result[0];

      const mail = firstRowDataPacket.mail;
      const id_state = firstRowDataPacket.id_state;
      const names = `${firstRowDataPacket.names} ${firstRowDataPacket.last_name}`;

      //paso #2 verifica si el usuario esta activo en la plataforma
      if (id_state != 2) {
        return res.json(
          `La cuenta de este usuario no está activa en este momento. 
           Le solicitamos amablemente que se comunique con nuestro equipo
           de soporte para recibir asistencia y reactivar su cuenta.
           Muchas gracias`
        );
      }

      //paso #3 genera una nueva contraseña
      const newPass = generarpassword();
      const passEncriptada = bcrypt.hashSync(newPass, 12);
      //paso #4 actualiza la contraseña en la DB
      const updatePass = `UPDATE user SET password = '${passEncriptada}' WHERE mail = '${mail}'`;
      await connetion.query(updatePass);
      //paso #5 envia el correo con la nueva contraseña
      resen.sendEmailRecuperarPass(mail, newPass, names);
      return res.json("Se ha enviado un correo con la nueva contraseña");
    } else {
      res.json("No se encontró un usuario con este correo");
    }
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
//Generar el token para el usuario
function generateToken(firstRowDataPacket) {
  const payload = {
    idIser: firstRowDataPacket.id,
    username: firstRowDataPacket.names,
    last_name: firstRowDataPacket.last_name,
    last_login: firstRowDataPacket.last_login,
    roles: firstRowDataPacket.roles,
  };

  // Configuración de opciones, incluyendo la expiración en segundos
  const options = {
    expiresIn: "4h", // vence en horas
    // expiresIn: "1m", ///minutos
  };

  // Generar el token con expiración de 2 horas
  const token = jwt.sign(payload, config.accessToken_jwt, options);

  return token;
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
export const methods = {
  authLogin,
  rememberPass,
};
