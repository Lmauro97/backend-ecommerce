import { getConnection } from "../database/database.js";
import fs from "fs";
import { authMiddleware } from "../middleware/auth-middleware.js";
import { cloudflareMiddleware } from "./../middleware/save-file-cloudflare.js";
import config from "./../config.js";

// ******lista de productos******
const getProduct = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(`
    
    SELECT
    pt.id,
    pt.code,
    pt.product_name,
    pt.main_photo,
    pt.stock,
    pt.purchase_price,
    pt.sale_price,
    pt.promotion_price,
    st.names_state,
    GROUP_CONCAT(ppt.photo_path) AS photo_paths
FROM
    product pt
LEFT JOIN
    state st ON pt.id_state = st.id
LEFT JOIN
    photo_product ppt ON pt.id = ppt.id_product
GROUP BY
    pt.id, pt.product_name, pt.main_photo, pt.stock, pt.purchase_price, pt.sale_price, pt.promotion_price, st.names_state;
    
    `);

    if (result.length > 0) {
      result.forEach;
      result[0].photo_paths = result[0].photo_paths
        ? result[0].photo_paths.split(",")
        : [];

      res.json(result);
    } else {
      res.json({ message: "Producto no encontrado" });
    }
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

// ******lista de productos activos******
const getProductActivo = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT * FROM product where id_state =2 order by `product_name` asc"
    );
    res.json(result);
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
// ******lista de productos activos******
const getProductCategoria = async (req, res) => {
  try {
    const idCategoria = req.params.idCategoria;

    const connetion = await getConnection();
    const result = await connetion.query(
      `SELECT * FROM product where id_state = 2 and id_categoria = ${idCategoria}`
    );
    res.json(result);
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
// ******lista TOP de productos******
const getProductTop = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT ps.`id_product`, p.`product_name`,`main_photo`, p.`sale_price`, SUM(ps.`amount`) AS total_sold FROM `products_sale` ps INNER JOIN `product` p ON ps.`id_product` = p.`id` GROUP BY ps.`id_product` ORDER BY total_sold DESC LIMIT 12;"
    );
    res.json(result);
    // res.json("respuesta desde el controlador");
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
// ******Datos del producto para el banner******
const getProductBanner = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion.query(
      "SELECT * FROM `product_banner` WHERE id=1"
    );
    res.json(result);
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};
const addProduct = async (req, res) => {
  try {
    const {
      nombreProduct,
      categoriaProduct,
      precioCompra,
      precioVenta,
      precioPromocion,
      estado,
      referenciaFabrica,
      proveedor,
      linkMercadoLibre,
      linkYoutube,
      stock,
      descripcion,
      caracteristicas,
      urlImgPrincipal,
      fechaCompra,
      pesoTotal,
      owner,
      label,
    } = req.body;
    let activaPromo = 0;
    if (req.body.activaPromo == "true") {
      activaPromo = 1;
    }

    // si no tiene token no consulta los productos
    if (!req.headers.authorization) {
      return;
    }
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);

    //si el token no pasa la verificacion no se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      let id_user = tokenData.idIser;
      const precioPromocionFin = precioPromocion ? precioPromocion : null;
      // Acceda a la variedad de archivos cargados
      const listImgFiles = req.files;
      //conexion a la DB
      const text = `
  INSERT INTO product (id, product_name, id_categoria, sale_price, promotion_price,on_promocion, id_owner, peso_total, stock, description, label,feature, main_photo, url_video, id_state, reference, code, id_provider, id_user, likes, dislike, purchase_price, date_purchase, link_mercado_libre) 
  VALUES (null, '${nombreProduct}', ${categoriaProduct}, ${precioVenta}, ${precioPromocionFin},${activaPromo} ,${owner}, ${pesoTotal}, ${stock}, '${descripcion}','${label}', '${caracteristicas}', '${urlImgPrincipal}', '${linkYoutube}', ${estado}, '${referenciaFabrica}', null, ${proveedor}, ${id_user}, null, null, ${precioCompra}, '${fechaCompra}', '${linkMercadoLibre}')`;
      const connetion = await getConnection();
      const result = await connetion.query(text);

      const idProduct = result.insertId;

      // const savedPaths = saveimg(listImgFiles, idProduct);
      const savedPaths = await saveimgCloudFlare(listImgFiles, idProduct);

      addRutasImg(savedPaths, idProduct, req, urlImgPrincipal);

      // Eliminar archivos temporales
      listImgFiles.forEach((file) => {
        console.log("ok");
        fs.unlinkSync(file.path);
      });

      res.json("Producto Registrado");
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
  } catch (error) {
    console.error(error); // Registrar el error

    res.status(500);
    res.send(error.message);
  }
};

const deletProduct = async (req, res) => {
  try {
    const { idproduct } = req.body;
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
      //conexion a la DB
      const connetion = await getConnection();
      const result = await connetion.query(
        `DELETE FROM shopping_cart WHERE id_user = ${id_user} AND id_product = ${idproduct}`
      );
      // Verificar si se eliminó correctamente
      if (result.affectedRows > 0) {
        res.json({ message: "Producto Eliminado Correctamente" });
      } else {
        res.json({
          message:
            "El producto no existe o no pertenece al usuario proporcionado",
        });
      }
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

// **************pasar este servicio para el carrito
const updateProduct = async (req, res) => {
  try {
    const { idproduct, amount } = req.body;
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
      //conexion a la DB
      const connetion = await getConnection();
      const result = await connetion.query(
        `UPDATE shopping_cart SET amount = ${amount} WHERE id_user = ${id_user} AND id_product =${idproduct}`
      );
      // Verificar si se eliminó correctamente
      if (result.affectedRows > 0) {
        res.json({ message: "Producto Actualizado Correctamente" });
      } else {
        res.json({
          message:
            "El producto no existe o no pertenece al usuario proporcionado",
        });
      }
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

//consulta los datos para la vista de detalle producto
const getDetalleProduct = async (req, res) => {
  try {
    const connetion = await getConnection();
    const result = await connetion
      .query(
        `
    SELECT  pdt.product_name AS tituloProducto, pdt.sale_price AS precio, pdt.description AS descripcion,pdt.on_promocion,pdt.url_video,
    pdt.feature AS caracteristicas, pdt.stock,pdt.link_mercado_libre,pdt.promotion_price AS precioPromocion,
    pdt.main_photo AS fotoPrincipal,  GROUP_CONCAT(pp.photo_path) AS listFotos 
    FROM  product pdt LEFT JOIN  photo_product pp ON pdt.id = pp.id_product
    WHERE    pdt.id = ${req.params.idProducto}
    GROUP BY    pdt.id, pdt.product_name, pdt.sale_price, pdt.description, pdt.feature, pdt.stock, pdt.main_photo;`
      )
      .then((result) => {
        if (result.length > 0) {
          result[0].listFotos = result[0].listFotos
            ? result[0].listFotos.split(",")
            : [];
          result[0].caracteristicas = result[0].caracteristicas
            ? result[0].caracteristicas.split("***")
            : [];
          res.json(result);
        } else {
          res.json({ message: "Producto no encontrado" });
        }
      });
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

///consulta los datos del producto que vamos a editar
const getDetalleProductEdit = async (req, res) => {
  try {
    console.log(req.params.idProducto);
    const connetion = await getConnection();
    const result = await connetion
      .query(
        `   SELECT
        pt.code,
            pt.product_name  AS nombreProduct,
            pt.id_categoria  AS categoriaProduct,
            pt.purchase_price  AS precioCompra,
            pt.sale_price  AS precioVenta,
            pt.promotion_price  AS precioPromocion,
            pt.id_state  AS estado,
            pt.reference  AS referenciaFabrica,
            pt.id_provider  AS proveedor,
            pt.link_mercado_libre  AS linkMercadoLibre,
            pt.stock  AS stock,
            pt.description  AS descripcion,
            pt.url_video  AS linkYoutube,
            pt.peso_total,
            label,
            pt.	id_owner ,
            pt.on_promocion,
            pt.feature  AS caracteristicas,pt.main_photo
            FROM product pt WHERE id =${req.params.idProducto}`
      )
      .then((result) => {
        if (result.length > 0) {
          // result[0].listFotos = result[0].listFotos
          //   ? result[0].listFotos.split(",")
          //   : [];
          // result[0].caracteristicas = result[0].caracteristicas
          //   ? result[0].caracteristicas.split("***")
          //   : [];
          res.json(result);
        } else {
          res.json({ message: "Producto no encontrado" });
        }
      });
  } catch (error) {
    res.status(500);
    res.send(error.message);
  }
};

async function saveimgCloudFlare(files, idProduct) {
  if (!Array.isArray(files)) {
    files = [files];
  }

  let savedPaths = [];

  try {
    // Verificar si existen fotos anteriores
    const resultVerify = await cloudflareMiddleware.s3
      .listObjectsV2({
        Bucket: config.bucket_name,
        Prefix: `fotosProducts/${idProduct}/`,
      })
      .promise();

    if (resultVerify.Contents && resultVerify.Contents.length > 0) {
      // Eliminar las fotos anteriores
      const deletePromises = resultVerify.Contents.map((photo) => {
        return cloudflareMiddleware.s3
          .deleteObject({
            Bucket: config.bucket_name,
            Key: photo.Key,
          })
          .promise();
      });

      await Promise.all(deletePromises);
    }

    // Subir las nuevas fotos
    for (const file of files) {
      // Lee el archivo
      const fileData = await fs.promises.readFile(file.path);

      // Define la ruta en R2
      const filePath = `fotosProducts/${idProduct}/${file.originalname}`;

      // Sube el archivo a R2
      const params = {
        Bucket: config.bucket_name,
        Key: filePath,
        Body: fileData,
        ContentType: file.mimetype,
      };

      await cloudflareMiddleware.s3.putObject(params).promise();

      // Almacena la ruta guardada
      savedPaths.push(`${config.rutaR2}/${filePath}`);
    }
  } catch (error) {
    console.error("Error al subir la imagen a R2:", error);
    throw error;
  }

  return savedPaths;
}

// ////renombrar imagenes
// function saveimg(files, idProduct) {
//   if (!Array.isArray(files)) {
//     // If only one file is provided, convert it to an array for consistency
//     files = [files];
//   }

//   const folderPath = `./fotosProducts/${idProduct}`;

//   // If the folder does not exist, create it
//   if (!fs.existsSync(folderPath)) {
//     fs.mkdirSync(folderPath, { recursive: true });
//   }

//   const savedPaths = [];

//   files.forEach((file) => {
//     //// Decodifica el nombre del archivo para manejar caracteres especiales
//     const decodedFilename = iconv.decode(
//       Buffer.from(file.originalname, "binary"),
//       "utf-8"
//     );

//     const newpath = `${folderPath}/${decodedFilename}`;
//     fs.renameSync(file.path, newpath);

//     // Store the saved path in the array
//     savedPaths.push(newpath);
//   });

//   // Return the array of saved paths
//   return savedPaths;
// }

///guarda rutas en la DB
async function addRutasImg(rutas, idProduct, req, urlImgPrincipal) {
  const connetion = await getConnection();

  ///valida si ya hay fotos de este producto
  const resultVerify = await connetion.query(
    `SELECT * FROM photo_product WHERE photo_product.id_product=${idProduct}`
  );

  // Check if any rows were returned
  if (resultVerify.length > 0) {
    // Data found, do something with it
    await connetion.query(
      `DELETE FROM photo_product WHERE id_product = ${idProduct}`
    );
  }

  // Get the server address and port from the 'req' object
  const serverAddress = req.headers.host;
  // guarda las rutas de las imagenes
  for (const imagePath of rutas) {
    await connetion.query(
      `INSERT INTO photo_product(id, id_product, photo_path) VALUES (null,${idProduct},'${imagePath}')`
    );
  }
  const urlImgPrincipalFin = `${config.rutaR2}/fotosProducts/${idProduct}/${urlImgPrincipal}`;
  ///actualisa la ruta de la foto principal
  await connetion.query(
    `UPDATE product SET main_photo = '${urlImgPrincipalFin}' WHERE product.id = ${idProduct}`
  );
}
// actualiza el producto
const editProduct = async (req, res) => {
  try {
    const {
      idProductEdit,
      nombreProduct,
      categoriaProduct,
      precioCompra,
      precioVenta,
      precioPromocion,
      estado,
      referenciaFabrica,
      proveedor,
      linkMercadoLibre,
      linkYoutube,
      stock,
      descripcion,
      caracteristicas,
      urlImgPrincipal,
      pesoTotal,
      owner,
      label,
    } = req.body;
    let activaPromo = 0;
    if (req.body.activaPromo == "true") {
      activaPromo = 1;
    }
    // Acceda a la variedad de archivos cargados
    const listImgFiles = req.files;

    // si no tiene token no consulta los productos
    if (!req.headers.authorization) {
      return res.json("Debes iniciar sesión nuevamente");
    }
    //obtener el token
    const token = req.headers.authorization.split(" ").pop();
    const tokenData = await authMiddleware.verifyToken(token);

    //si el token  pasa la verificacion se continua con el proceso
    if (tokenData) {
      //obtener el id del usuario
      let id_user = tokenData.idIser;

      //conexion a la DB
      const text = `
    UPDATE product SET  product_name='${nombreProduct}',id_categoria=${categoriaProduct},id_owner=${owner}, peso_total=${pesoTotal},sale_price=${precioVenta},
    promotion_price=${precioPromocion},on_promocion=${activaPromo},stock=${stock},description='${descripcion}',label='${label}',feature='${caracteristicas}',	main_photo='${urlImgPrincipal}',
   url_video= '${linkYoutube}',id_state=${estado},reference='${referenciaFabrica}',id_provider=${proveedor},id_user=${id_user},
    purchase_price=${precioCompra},link_mercado_libre='${linkMercadoLibre}' WHERE  product.id = ${idProductEdit}`;
      const connetion = await getConnection();
      const result = await connetion.query(text);

      // const savedPaths = saveimg(listImgFiles, idProductEdit);

      const savedPaths = await saveimgCloudFlare(listImgFiles, idProductEdit);
      addRutasImg(savedPaths, idProductEdit, req, urlImgPrincipal);
      res.json("Producto Registrado");
      return;
    } else {
      return res.json(
        "Token modificado o vencido, debes iniciar sesión nuevamente"
      );
    }
  } catch (error) {
    console.error(error); // Registrar el error

    res.status(500);
    res.send(error.message);
  }
};

export const methods = {
  getProduct,
  addProduct,
  getProductTop,
  deletProduct,
  updateProduct,
  getDetalleProduct,
  getProductActivo,
  getProductCategoria,
  getDetalleProductEdit,
  editProduct,
  getProductBanner,
};
