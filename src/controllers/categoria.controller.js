import { getConnection } from "../database/database.js";

const getListCategoria = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(`SELECT * FROM category `);
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

export const methods = {
  getListCategoria,
};
