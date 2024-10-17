import { Resend } from "resend";
import config from "./../config.js";

const resend = new Resend(config.accessResend);

// exportar funcio
export function sendEmail(correoDestino, nombre, pass) {
  resend.emails.send({
    from: "registrosusuario@compratodoonline.com",
    // to: "jerson_d00@hotmail.com",
    to: correoDestino,
    subject: "Confirmación De Registro Compratodoonline.com",
    html: `<p>¡Hola ${nombre} bienvenido! Confirma tu registro ahora.</p>
    <p>Tu usuario es <b>${correoDestino}</b></p>
    <p>Tu contraseña es <b>${pass}</b></p>
    <p>Haz clic en el siguiente botón para ingresar a la tienda:</p>
    <a href="http://localhost:4200/home/" 
    style="border: solid;
    border-radius: 5px;
    padding: 9px;
    margin: 16px 0;
    text-decoration: none;
    font-size: 16px;" 
    target="_blank">Ir a la tienda</a>
    <br>
    `,
  });
}

export function sendEmailpqrs(correoDestino, nombre, numRadicado) {
  resend.emails.send({
    from: "pqrs@compratodoonline.com",
    to: correoDestino,
    cc: "navarrojerson243@gmail.com",
    subject: "Confirmación Recibido de Solicitud PQRS",
    html: `
          Hola ${nombre},
          <br>
          <br>
          ¡Nos alegra informarte que hemos recibido tu solicitud con éxito!
          <br>
          <br>

          La misma ha sido registrada con el número de radicado  <b> ${numRadicado}</b>.
          <br>
          <br>

          Nuestro equipo de expertos se encuentra revisando tu solicitud con la mayor atención y diligencia posible. Te contactaremos a la brevedad para darte una respuesta completa y detallada.
          <br>
          <br>

          Mientras tanto, si tienes alguna duda o pregunta, no dudes en contactarnos.
          <br>
          <br>

          Atentamente,
          <br>
          <br>

          El equipo de Compra Todo Online.`,
  });
}
export function sendEmailConfCompra(
  correoDestino,
  nombre,
  status,
  numPedido,
  totalPago,
  direccion
) {
  const fechaPago = new Date().toLocaleDateString();
  resend.emails.send({
    from: "estado_pedido@compratodoonline.com",
    to: correoDestino,
    bcc: ["navarrojerson243@gmail.com"],
    subject: "Confirmación De Compra",
    html: `<p>¡Hola, ${nombre}!</p>
    <p>Gracias por utilizar los servicios de <b>compratodoonline.com</b>. los siguientes son los datos de tu compra</p>
    <p>Estado De La Transacción: <b>${status}</b></p>
    <p>Referencia De Pedido: ${numPedido}</p>
    <p>Total Del Pago: ${totalPago}</p>
    <p>Fecha De Compra: ${fechaPago}</p>
    <p>Dirección De Envío: ${direccion}</p>

    <p>Gracias por confiar en nosotros.</p>
    <br>
    `,
  });
}

export function sendEmailRecuperarPass(correoDestino, pass, nombre) {
  resend.emails.send({
    from: "soporte@compratodoonline.com",
    to: correoDestino,
    subject: "Recuperación De Contraseña",
    html: `<p>¡Hola, ${nombre}!</p>
    <p>Recibimos una solicitud para recuperar tu contraseña.</p>
    <p>Tu nueva contraseña es: <b>${pass}</b></p>
    <p>Si no solicitaste este cambio, por favor ignora este mensaje.</p>
    <br>
    `,
  });
}

export const resen = {
  sendEmail,
  sendEmailConfCompra,
  sendEmailpqrs,
  sendEmailRecuperarPass,
};
