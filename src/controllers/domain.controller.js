import { getConnection } from "../database/database.js";

const getTypeIdentity = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "select id , names_card  from type_card tc where id_estado=2"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const getDepartament = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "select id, names_department  from department   where id_estado=2"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

//lista de ciudades
const getCity = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "select id, name_city,id_department  from city c   where id_estado = 2"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
//lista de estados
const getState = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT id,names_state,tipo_state  FROM `state` WHERE tipo_state='Comunes' or tipo_state='Producto'"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

//lista de propietarios
const getOwner = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT id_owner ,name_owner  FROM `owner` "
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const getProviders = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT id, providers_name	FROM `providers` WHERE id_estado=2"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const getTarifa = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT * FROM `tarifa_envío` WHERE id_estado = 2"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const getLabel = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT id_label,nombre FROM `label_product` WHERE id_state = 2"
    );
    res.json({
      status: 200,
      total: result.length,
      label: result,
    });
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

const addLabel = async (req, res) => {
  try {
    console.log(req.body.label);
    const connetion = await getConnection();

    const result = await connetion.query(
      `INSERT INTO label_product (nombre, id_state) VALUES ('${req.body.label}', '2')`
    );
    res.json({
      status: 200,
      message: "Nueva etiqueta insertada correctamente",
    });
  } catch (error) {
    res.status(500);

    res.send(error.message);
  }
};
export const methods = {
  getTypeIdentity,
  getDepartament,
  getCity,
  getState,
  getProviders,
  getOwner,
  getTarifa,
  getLabel,
  addLabel,
};
