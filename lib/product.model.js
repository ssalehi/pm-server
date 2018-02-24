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

  getProduct(id) {

    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);

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

  getProductColor(id) {

    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);


    return this.ProductModel.findOne({
      '_id': id
    }).populate('colors.color_id').lean()
      .then(result => {
        result.colors.map(color => {
          color.info = color.color_id;
          delete  color.color_id;
          return color;
        });
        return Promise.resolve(result)
      });
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

    body.product_type = body.product_type.trim();
    body.brand = body.brand.trim();


    if (!mongoose.Types.ObjectId.isValid(body.product_type) || !mongoose.Types.ObjectId.isValid(body.brand))
      return Promise.reject(error.invalidId);


    if (!body.id) {
      let newProduct = new this.ProductModel({
        name: body.name,
        product_type: body.product_type,
        brand: body.brand,
        base_price: body.base_price,
        desc: body.desc
      });
      return newProduct.save();

    } else {
      return this.ProductModel.update({
          "_id": mongoose.Types.ObjectId(body.id),
        },
        {
          $set: {
            'name': body.name,
            'product_type': body.product_type,
            'brand': body.brand,
            'base_price': body.base_price,
            'desc': body.desc,
          }
        });

    }
  }

  /*
   *
   *
   *
   */

  /**
   * @param:
   *  id : id of product
   * @returns {Promise.<*>}
   */
  deleteProduct(id) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    return this.ProductModel.remove({_id: mongoose.Types.ObjectId(id)});
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
          'instances.product_color_id': {$ne: mongoose.Types.ObjectId(body.productColorId)}
        },
        {
          $addToSet: {
            'instances': {
              product_color_id: mongoose.Types.ObjectId(body.productColorId),
              price: body.price,
              size: body.size
            }
          }
        });
    } else {
      return this.ProductModel.update({
          "_id": mongoose.Types.ObjectId(body.id),
          "instances._id": mongoose.Types.ObjectId(body.productInstanceId)
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
   * @param:
   *  id : id of product
   *  productColorId: id of product color inside the instances array
   * @returns {Promise.<*>}
   */
  deleteInstance(id, productColorId) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!productColorId)
      return Promise.reject(error.productColorIdRequired);

    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(id),
      },
      {
        $pull: {
          'instances': {
            'product_color_id': mongoose.Types.ObjectId(productColorId)
          }
        }
      });
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

    return this.ProductModel.findById(mongoose.Types.ObjectId(body.id)).then(res => {


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
   * @param:
   *  id : id of product
   *  productColorId: id of product color inside the instances array
   *  warehouseId: id of warehouse in inventory of each instance
   * @returns {Promise.<*>}
   */
  deleteInventory(id, productColorId, warehouseId) {

    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!productColorId)
      return Promise.reject(error.productColorIdRequired);
    if (!warehouseId)
      return Promise.reject(error.productInstanceWarehouseIdRequired);

    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(id),
        "instances.product_color_id": mongoose.Types.ObjectId(productColorId)
      },
      {
        $pull: {
          'instances.$.inventory': {
            'warehouse_id': mongoose.Types.ObjectId(warehouseId)
          }
        }
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

    id = id.trim();
    colorId = colorId.trim();
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(colorId))
      return Promise.reject(error.invalidId);


    const tempFilePath = fileData.path.replace(/\\/g, '/');
    const path = tempFilePath.substr(tempFilePath.indexOf('public') + 'public'.length);

    // insert images of pre existing color
    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(id),
        "colors.color_id": mongoose.Types.ObjectId(colorId)
      },
      {
        $addToSet: {
          'colors.$.images': path,
        }
      }).then(res => {

      if (res.n === 0) {// no color found for this color_id, add new color and its images to product colors list
        let newColor = {

          color_id: colorId,
          images: [path]
        };
        return this.ProductModel.update({
            "_id": mongoose.Types.ObjectId(id),
          },
          {
            $addToSet: {
              'colors': newColor,
            }
          }).then(res => {

          res.downloadURL = path;
          return Promise.resolve(res);
        })
      }
      else {
        res.downloadURL = path;
        return Promise.resolve(res);
      }

    });

  }

  /**
   * @param:
   *  id : id of product
   *  colorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  deleteColor(id, colorId) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!colorId)
      return Promise.reject(error.productColorIdRequired);

    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(id),
      },
      {
        $pull: {
          'colors':
            {
              'color_id': mongoose.Types.ObjectId(colorId)
            }
        }
      });
  }

  // deleteOneImage(id, colorId, imageUrl) {
  //   if (!id)
  //     return Promise.reject(error.productIdRequired);
  //   if (!colorId)
  //     return Promise.reject(error.productColorIdRequired);
  //   if(!imageId)
  //     return Promise.reject(error.productImageIdRequired);
  //
  //   return this.ProductModel.update(
  //     {
  //       "_id": mongoose.Types.ObjectId(id),
  //     },
  //     {
  //       "color_id": mongoose.Types.ObjectId(colorId),
  //     },
  //     {
  //       $pull: {
  //         'images':
  //           {
  //             'color_id': mongoose.Types.ObjectId(colorId)
  //           }
  //       }
  //     });
  // }

  /**
   * @param body contains :
   *  id : id of product
   *  tagId: id of tag inside the tags array
   * @returns {Promise.<*>}
   */
  setTag(body) {

    if (!body.id)
      return Promise.reject(error.productIdRequired);
    if (!body.tagId)
      return Promise.reject(error.productTagIdRequired);

    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(body.id),
      },
      {
        $addToSet: {
          'tags': mongoose.Types.ObjectId(body.tagId)
        }
      });

  }

  /**
   * @param:
   *  id : id of product
   *  tagId: id of tag inside the tags array
   * @returns {Promise.<*>}
   */
  deleteTag(id, tagId) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!tagId)
      return Promise.reject(error.productTagIdRequired);

    return this.ProductModel.update({
        "_id": mongoose.Types.ObjectId(id),
      },
      {
        $pull: {'tags': mongoose.Types.ObjectId(tagId)}
      });
  }

  search(options, offset, limit) {
    let result;

    return this.ProductModel.aggregate(
      [
        {
          $match: {name: {$regex: options.phrase, $options: 'i'}}
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
        },
        {
          $project: {
            "name": 1,
            "base_price": 1,
            "brand.name": 1,
            "product_type.name": 1,
            "colors": 1,
          }
        },
        {
          $sort: {
            'name': 1,
          }
        },
        {
          $skip: Number.parseInt(offset)
        },
        {
          $limit: Number.parseInt(limit)
        }
      ]
    ).then(res => {
      result = res;
      return this.ProductModel.aggregate(
        [
          {
            $match: {name: {$regex: options.phrase, $options: 'i'}}
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
          },
          {
            $count: "count"
          },
        ]
      ).then(res => {
        let totalCount = res[0] ? res[0].count : 0;
        return Promise.resolve({
          data: result,
          total: totalCount,
        });
      });
    });
  }


  suggest(phrase) {
    return this.ProductModel.aggregate([
      {
        $match: {name: {$regex: phrase, $options: 'i'}}
      }, {
        $lookup: {
          from: 'producttypes',
          localField: 'product_type',
          foreignField: '_id',
          as: 'product_type'
        },
      }, {
        $unwind: {
          path: "$product_type",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'brands',
          localField: 'brand',
          foreignField: '_id',
          as: 'brand'
        },
      }, {
        $unwind: {
          path: "$brand",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $project: {
          "name": 1,
          "product_type": "$product_type.name",
          "brand": "$brand.name",
        }
      }
    ]).limit(5).sort({name: 1});
  }

}

Product.test = false;

module.exports = Product;