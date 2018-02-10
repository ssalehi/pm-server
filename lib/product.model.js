/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Product extends Base {

  constructor(test = Product.test) {

    super('Product', test);

    this.ProductModel = this.model
  }

  getAllProducts() {

    return this.ProductModel.aggregate(
      [
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand"
          }
        },
        {
          $unwind: "$brand"
        },
        {
          $lookup: {
            from: "producttypes",
            localField: "product_type",
            foreignField: "_id",
            as: "product_type"
          }
        },
        {
          $unwind: "$product_type"
        },
        {
          $project: {
            "name": 1,
            "base_price": 1,
            "brand.name": 1,
            "product_type.name": 1,
          }
        }
      ]
    );
  }

  getProduct(id) {

    return this.ProductModel.aggregate(
      [
        {
          $match: {_id: mongoose.Types.ObjectId(id)}
        },
        {
          $lookup: {
            from: "brands",
            localField: "brand",
            foreignField: "_id",
            as: "brand"
          }
        },
        {
          $unwind: "$brand"
        },
        {
          $lookup: {
            from: "producttypes",
            localField: "product_type",
            foreignField: "_id",
            as: "product_type"
          }
        },
        {
          $unwind: "$product_type"
        }

      ]
    );
  }

  setProduct(body) {
    if (!body.name)
      return Promise.reject(error.productNameRequired);
    if (!body.product_type)
      return Promise.reject(error.productTypeRequired);
    if (!body.brand)
      return Promise.reject(error.productBrandRequired);
    if (!body.base_price)
      return Promise.reject(error.productBasePriceRequired);

    let query = body.id ? {_id: body.id} : {};

    return this.ProductModel.findOneAndUpdate(query, {
      name: body.name,
      product_type: body.product_type,
      brand: body.brand,
      base_price: body.base_price,
      desc: body.desc
    }, {upsert: true});
  }

  /**
   *
   * @param body contains :
   *  id : id of product
   *  product_color_id: id of product color object inside the array of product document
   *  price (Optional): price of product instance. used when price is different with base product price
   *  size: size of instance
   *  productInstanceId: used when current instance is modifying
   * @returns {Promise.<*>}
   */
  setInstance(body) {

    if (!body.id)
      return Promise.reject(error.productIdRequired);
    if (!body.productColorId)
      return Promise.reject(error.productColorIdRequired);
    if (!body.size)
      return Promise.reject(error.productInstanceSizeRequired);


    if (!body.productInstanceId) {
      return this.ProductModel.update({
          "_id": body.id,
        },
        {
          $addToSet: {
            'instances': {
              product_color_id: body.productColorId,
              price: body.price,
              size: body.size
            }
          }
        });
    } else {
      return this.ProductModel.update({
          "_id": body.id,
          "instances._id": body.productInstanceId
        },
        {
          $set: {
            'instances.$.price': body.price,
            'instances.$.size': body.size,
          }
        });

    }
  }

  /**
   *
   * @param body contains :
   *  id : id of product
   *  productInstanceId: id of product instance whose inventory is modifying
   *  warehouseId (Optional): id of warehouse where instance is in.
   *  count: count of instances in a warehouse
   * @returns {Promise.<*>}
   */
  setInventory(body) {

    if (!body.id)
      return Promise.reject(error.productIdRequired);
    if (!body.productInstanceId)
      return Promise.reject(error.productInstanceIdRequired);
    if (!body.count)
      return Promise.reject(error.productInstanceCountRequired);
    if (!body.warehouseId)
      return Promise.reject(error.productInstanceWarehouseIdRequired);

    return this.ProductModel.findById(body.id).then(res => {


      let product_instance = res._doc.instances.id(body.productInstanceId);

      let inventory = product_instance._doc.inventory.find(i => i._doc.warehouse_id.equals(body.warehouseId));

      if (inventory) { // update current existing inventory
        inventory.count = body.count;
      } else {
        product_instance._doc.inventory.push({
          warehouse_id: body.warehouseId,
          count: body.count
        });
      }

      return res.save();

    });

  }

  /**
   *  id : id of product
   *  color_id: id of color in color collection
   * fileData data of uploaded file.
   * @returns {Promise.<*>}
   */
  setColor(id, colorId, fileData) {

    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!colorId)
      return Promise.reject(error.productColorIdRequired);
    if (!fileData || fileData.path === 0)
      return Promise.reject(error.badUploadedFile);

    const tempFilePath = fileData.path.replace(/\\/g, '/');
    const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);


    // insert images of pre existing color
    return this.ProductModel.update({
        "_id": id,
        "colors.color_id": colorId
      },
      {
        $addToSet: {
          'colors.$.images': path,
        }
      }).then(res => {

      if (res.n === 0) {// add new color and its images to product
        let newColor = {

          color_id: colorId,
          images: [path]
        };
        return this.ProductModel.update({
            "_id": id,
          },
          {
            $set: {
              'colors': [newColor],
            }
          })
      }
      else {
        return Promise.resolve(res);


      }

    });

  }

}

Product.test = false;

module.exports = Product;