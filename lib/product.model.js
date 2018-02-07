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
          $match:{ _id:  mongoose.Types.ObjectId(id) }
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
   *  color_id: id of color in store. i.e: 101
   *  images: list of images' url for a specific color
   *  productColorId (optional): update current product color
   * @returns {Promise.<*>}
   */
  setColor(body) {

    if (!body.id)
      return Promise.reject(error.productIdRequired);
    if (!body.colorId)
      return Promise.reject(error.productColorIdRequired);
    if (!body.images || body.images.length === 0)
      return Promise.reject(error.productColorImagesRequired);


    let images = [];
    body.images.forEach(url => images.push({url}));

    if (!body.productColorId) {
      return this.ProductModel.update({
          "_id": body.id,
        },
        {
          $addToSet: {
            'colors': {
              color_id: body.colorId,
              images
            }
          }
        });
    } else {
      return this.ProductModel.update({
          "_id": body.id,
          "colors._id": body.productColorId
        },
        {
          $set: {
            'colors.$.color_id': body.colorId,
            'colors.$.images': images,
          }
        });

    }
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
            'instances.$.product_color_id': body.productColorId,
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

}

Product.test = false;

module.exports = Product;