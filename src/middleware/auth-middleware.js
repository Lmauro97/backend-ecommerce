import jwt from "jsonwebtoken";
import config from "./../config.js";

//verificacion del token
const verifyToken = async (token) => {
  try {
    const decodedToken = jwt.verify(token, config.accessToken_jwt);

    // Verificar si el token ha expirado
    if (isTokenExpired(decodedToken)) {
      return null; // Token expirado
    }

    return decodedToken;
  } catch (error) {
    return null;
  }
};

const isTokenExpired = (decodedToken) => {
  const expirationTime = decodedToken.exp * 1000; // Convertir a milisegundos
  const currentTime = Date.now();
  return currentTime > expirationTime;
};

export const authMiddleware = {
  verifyToken,
};
