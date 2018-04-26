/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const _ = require('lodash');
const rmPromise = require('rimraf-promise');
const env = require('../env');
const path = require('path');


class Product extends Base {

  constructor(test = Product.test) {

    super('Product', test);

    this.ProductModel = this.model;
  }

  getProduct(id) {

    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);

    return this.ProductModel.findById(id);
  }

  getInstance(productId, productInstanceId) {

    return this.ProductModel.findOne({
      _id: mongoose.Types.ObjectId(productId),
    }).lean()
      .then(res => {
        if (res.instances) {
          let foundInstance = res.instances.find(x => x._id.toString() === productInstanceId);
          return Promise.resolve(foundInstance);
        } else
          return Promise.resolve();
      })
  }

  getProductColor(id) {

    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);


    return this.ProductModel.findOne({
      '_id': mongoose.Types.ObjectId(id)
    }).select('colors');
  }

  getProducts(productIds, typeIds, tagIds, brandIds, getInstances = true) {
    let queryArray = [];
    if (productIds && productIds.length)
      queryArray.push({'_id': {$in: productIds}});

    let andQueryArray = [];
    if (brandIds && brandIds.length) {
      andQueryArray.push({'brand.brand_id': {$in: brandIds}});
    }
    if (typeIds && typeIds.length)
      andQueryArray.push({'product_type.product_type_id': {$in: typeIds}});

    if (tagIds && tagIds.length)
      andQueryArray.push({'tags.tag_id': {$in: tagIds}});

    if (!queryArray.length && !andQueryArray)
      return Promise.resolve([]);

    if (andQueryArray.length)
      queryArray.push({$and: andQueryArray});

    if (!queryArray)
      queryArray.push(1);

    return this.ProductModel.aggregate([
      {
        $match: {
          $or: queryArray
        }
      },
      {
        $unwind: {
          path: '$instances', // unwind instances to collect sizes
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$_id',
          date: {$first: '$date'},
          name: {$first: '$name'},
          product_type: {$first: '$product_type'},
          brand: {$first: '$brand'},
          base_price: {$first: '$base_price'},
          campaigns: {$first: '$campaigns'},
          tags: {$first: '$tags'},
          colors: {$first: '$colors'},
          inventories: {
            // $push: {$subtract: ['$instances.inventory.count', '$instances.inventory.reserved']}
            $push: '$instances.inventory.count'
          },
          instances: {$push: '$instances'},
          size: {
            $push: '$instances.size'
          },
        }
      }
      , {
        $unwind: {
          path: '$inventories', // unwind inventories to collect counts of product in inventories => inventories would be array for each instance
          preserveNullAndEmptyArrays: true
        }
      }
      ,
      {
        $unwind: {
          path: '$inventories', // unwind inventories (array for each instance) again to collect counts of product in inventories
          preserveNullAndEmptyArrays:
            true
        }
      }
      ,
      {
        $group: {
          _id: '$_id',
          date:
            {
              $first: '$date'
            }
          ,
          name: {
            $first: '$name'
          }
          ,
          product_type: {
            $first: '$product_type.name'
          }
          ,
          brand: {
            $first: '$brand.name'
          }
          ,
          base_price: {
            $first: '$base_price'
          }
          ,
          campaigns: {
            $first: '$campaigns'
          }
          ,
          tags: {
            $first: '$tags'
          }
          ,
          colors: {
            $first: '$colors'
          }
          ,
          size: {
            $first: '$size'
          }
          ,
          instances: {
            $first: '$instances'
          }
          ,
          inventories: {
            $first: '$inventories'
          }
          ,
          discount: {
            $first: '$discount'
          }
          ,
          count: {
            $sum: '$inventories'
          }
        }
      }
      ,
      {
        $unwind: {
          path: '$campaigns', // unwind campaign ids to look up for campaigns and discounts
          preserveNullAndEmptyArrays:
            true
        }
      }
      ,
      {
        $lookup: {
          from: 'campaign',
          localField:
            'campaigns',
          foreignField:
            '_id',
          as:
            'campaign'
        }
      }
      ,
      {
        $unwind: {
          path: '$campaign', // unwind campaign ids to look up for campaigns and discounts
          preserveNullAndEmptyArrays:
            true
        }
      }
      ,
      {
        $project: {
          _id: 1,
          date:
            1,
          name:
            1,
          product_type:
            1,
          brand:
            1,
          base_price:
            1,
          campaigns:
            1,
          campaign:
            {
              $ifNull: ['$campaign', []]
            }
          ,
          tags: 1,
          colors:
            1,
          size:
            1,
          inventories:
            1,
          instances:
            1,
          discount:
            1,
          count:
            1
        }
      }
      ,
      {
        $project: {
          _id: 1,
          date:
            1,
          name:
            1,
          product_type:
            1,
          brand:
            1,
          base_price:
            1,
          campaigns:
            1,
          campaign:
            1,
          tags:
            1,
          colors:
            1,
          size:
            1,
          inventories:
            1,
          instances:
            1,
          discount:
            {
              $cond: {
                if:
                  {
                    $ifNull: ['$campaign.coupon_code', false]
                  }
                ,
                then: 0
                ,
                else:
                  '$campaign.discount_ref'
              }
            }
          ,
          count: 1
        }
      }
      ,
      {
        $match: {
          '$or':
            [
              {'discount': {$eq: 0}},
              {
                '$and': [
                  {'campaign.end_date': {$gte: new Date()}},
                  {'campaign.start_date': {$lte: new Date()}}
                ]
              }]
        }
      }
      ,
      {
        $group: {
          _id: '$_id',
          date:
            {
              $first: '$date'
            }
          ,
          name: {
            $first: '$name'
          }
          ,
          product_type: {
            $first: '$product_type'
          }
          ,
          brand: {
            $first: '$brand'
          }
          ,
          base_price: {
            $first: '$base_price'
          }
          ,
          colors: {
            $first: '$colors'
          }
          ,
          size: {
            $first: '$size'
          }
          ,
          count: {
            $first: '$count'
          }
          ,
          discount: {
            $push: {
              $subtract: [1, '$discount']
            }
          }
          ,
          instances: {
            $first: '$instances'
          }
          ,
          inventories: {
            $first: '$inventories'
          }
          ,
          tags: {
            $first: '$tags'
          }
          ,
        }
        ,
      }
    ])
      ;
  }

  getProductCoupon(productIds, coupon_code) {
    return this.ProductModel.aggregate([
      {
        $match: {_id: {$in: productIds}}
      },
      {
        $unwind: {
          path: '$campaigns',
        }
      },
      {
        $lookup: {
          from: 'campaign',
          localField: 'campaigns',
          foreignField: '_id',
          as: 'campaign',
        }
      },
      {
        $unwind: {
          path: '$campaign',
        }
      },
      {
        $match: {
          $and: [
            {'campaign.coupon_code': coupon_code},
            {
              $or: [
                {
                  $and: [
                    {'campaign.end_date': {$exists: false}},
                    {'campaign.start_date': {$exists: false}}
                  ]
                },
                {
                  $and: [
                    {'campaign.end_date': {$gte: new Date()}},
                    {'campaign.start_date': {$lte: new Date()}}
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        $project: {
          product_id: '$_id',
          coupon_code: '$campaign.coupon_code',
          discount: '$campaign.discount_ref',
        }
      }
    ]);
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

    if (!mongoose.Types.ObjectId.isValid(body.product_type) || !mongoose.Types.ObjectId.isValid(body.brand))
      return Promise.reject(error.invalidId);

    let brand, type;
    return models['Brand' + (Product.test ? 'Test' : '')].findById(mongoose.Types.ObjectId(body.brand)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.brandNotFound);

        brand = res;
        return models['ProductType' + (Product.test ? 'Test' : '')].findById(mongoose.Types.ObjectId(body.product_type)).lean();
      })
      .then(res => {
        if (!res)
          return Promise.reject(error.typeNotFound);

        type = res;

        if (!body.id) {
          let newProduct = new this.ProductModel({
            name: body.name,
            product_type: {name: type.name, product_type_id: type._id},
            brand: {name: brand.name, brand: brand._id},
            base_price: body.base_price,
            campaigns: []
          });
          return newProduct.save();

        } else {
          return this.ProductModel.update({
              '_id': mongoose.Types.ObjectId(body.id),
            },
            {
              $set: {
                'name': body.name,
                'product_type': {name: type.name, product_type_id: type._id},
                'brand': {name: brand.name, brand_id: brand._id},
                'base_price': body.base_price,
                'desc': body.desc ? body.desc : ''
              }
            });

        }

      });

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

  setInstance(body, productId, productInstanceId) {

    if (!productId)
      return Promise.reject(error.productIdRequired);
    if (!body.productColorId)
      return Promise.reject(error.productColorIdRequired);
    if (!body.size)
      return Promise.reject(error.productInstanceSizeRequired);

    if (!body.barcode)
      return Promise.reject(error.productInstanceBarcodeRequired);


    if (!productInstanceId) {
      return this.ProductModel.update({
          '_id': mongoose.Types.ObjectId(productId),
          'instances.product_color_id': {$ne: mongoose.Types.ObjectId(body.productColorId)}
        },
        {
          $addToSet: {
            'instances': {
              product_color_id: mongoose.Types.ObjectId(body.productColorId),
              price: body.price,
              size: body.size,
              barcode: body.barcode
            }
          }
        });
    } else {
      return this.ProductModel.update({
          '_id': mongoose.Types.ObjectId(productId),
          'instances._id': mongoose.Types.ObjectId(productInstanceId)
        },
        {
          $set: {
            'instances.$.price': body.price,
            'instances.$.size': body.size,
            'instances.$.barcode': body.barcode,
            'instances.$.product_color_id': mongoose.Types.ObjectId(body.productColorId)
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
        '_id': mongoose.Types.ObjectId(id),
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

    if (!body.warehouseId)
      return Promise.reject(error.productInstanceWarehouseIdRequired);

    if (!body.hasOwnProperty('count') && !body.hasOwnProperty('delCount') && !body.hasOwnProperty('delReserved'))
      return Promise.reject(error.productInstanceCountRequired);


    return this.ProductModel.findById(mongoose.Types.ObjectId(body.id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound);

        let foundInstance = res.instances.find(x => x._id.toString() === body.productInstanceId.toString());
        if (!foundInstance)
          return Promise.reject(error.productInstanceNotExist);

        if (Number.parseInt(body.price))
          foundInstance.price = Number.parseInt(body.price);


        let foundInventory = foundInstance.inventory.find(i => i.warehouse_id.toString() === body.warehouseId.toString());
        // TODO: why it is coming here with warehouses without inventory of the instance?
        if (!foundInventory) {
          return Promise.resolve();
        }
        // resereved number should be changed before count 
        let delReserved = Number.parseInt(body.delReserved);
        if (delReserved && foundInventory.reserved + delReserved <= foundInventory.count) {
          foundInventory.reserved += delReserved;
        }

        // count number should be changed after reserved 
        let delCount = Number.parseInt(body.delCount);
        let count = Number.parseInt(body.count);
        if (delCount && foundInventory.count + delCount >= foundInventory.reserved) {
          foundInventory.count += delCount;
        } else if (count && count >= foundInventory.reserved) {
          foundInventory.count = count;
        }


        if (foundInventory.count < foundInventory.reserved)
          return Promise.reject(error.invalidInventoryCount);


        return this.ProductModel.update({
          _id: mongoose.Types.ObjectId(body.id),
          'instances._id': mongoose.Types.ObjectId(body.productInstanceId)
        }, {
          $set: {
            'instances.$': foundInstance
          }
        })

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
        '_id': mongoose.Types.ObjectId(id),
        'instances.product_color_id': mongoose.Types.ObjectId(productColorId)
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
   *  is_thumbnail: true/false checks if this is thumbnail or angles
   *  fileData data of uploaded file.
   * @returns {Promise.<*>}
   */
  setImage(id, colorId, is_thumbnail, fileData) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!colorId)
      return Promise.reject(error.productColorIdRequired);
    if (!fileData || fileData.path === 0)
      return Promise.reject(error.badUploadedFile);

    is_thumbnail = is_thumbnail === 'true';

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(colorId))
      return Promise.reject(error.invalidId);

    let foundColor, colors, preThumb;
    return models['Color' + (Product.test ? 'Test' : '')].findById(mongoose.Types.ObjectId(colorId)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.colorNotFound);

        foundColor = res;

        return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean();
      })
      .then(product => {

        let update;
        let foundProductColor = product.colors.find(x => x.color_id.toString() === foundColor._id.toString());

        if (!foundProductColor)
          return Promise.reject(error.productColorNotExist);

        if (!foundProductColor.image.thumbnail && !is_thumbnail)
          return Promise.reject(error.productColorThumbnailNotFound)

        if (is_thumbnail) {
          preThumb = foundProductColor.image.thumbnail;
          foundProductColor.image.thumbnail = fileData.filename;
        } else {

          if (!foundProductColor.image.angles.find(x => x === fileData.filename)) {
            foundProductColor.image.angles.push(fileData.filename);
          }
        }

        colors = product.colors;

        if (is_thumbnail && preThumb) {
          return rmPromise(env.uploadProductImagePath + path.sep + id + path.sep + colorId + path.sep + preThumb)
        }
        else {
          return Promise.resolve();
        }
      }).then(res => {

        return this.ProductModel.update({
          _id: mongoose.Types.ObjectId(id)
        }, {
          colors
        })

      }).then(res => {
        if (res.n === 1) {
          return Promise.resolve({downloadURL: fileData.filename});
        }
        else
          return Promise.reject(error.productColorEditFailed);
      });
  }

  /**
   * @param:
   *  id : id of product
   *  colorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  removeColor(id, colorId) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!colorId)
      return Promise.reject(error.productColorIdRequired);

    return this.ProductModel.update({
        '_id': mongoose.Types.ObjectId(id),
      },
      {
        $pull: {
          'colors': {
            'color_id': mongoose.Types.ObjectId(colorId)
          }
        }
      })
      .then(res => {
        if (res.n === 1 && res.nModified === 1) {
          return rmPromise(env.uploadProductImagePath + path.sep + id + path.sep + colorId)
        }
        else
          return Promise.reject(error.ProudctImageRemoveFailed)
      })
  }

  /**
   * @param:
   *  id : id of product
   *  colorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  removeImage(id, colorId, angle) {
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.productIdRequired);
    if (!colorId || !mongoose.Types.ObjectId.isValid(colorId))
      return Promise.reject(error.productColorIdRequired);
    if (!angle)
      return Promise.reject(error.productImageNameRequired);

    let colors;
    return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound)

        let foundProductColor = res.colors.find(x => x.color_id.toString() === colorId);
        if (!foundProductColor)
          return Promise.reject(error.productColorNotExist);

        let index = foundProductColor.image.angles.findIndex(x => x === angle);
        if (index >= 0)
          foundProductColor.image.angles.splice(index, 1);


        colors = res.colors;

        return rmPromise(env.uploadProductImagePath + path.sep + id + path.sep + colorId + path.sep + angle)

      }).then(res => {

        return this.ProductModel.update({
          _id: mongoose.Types.ObjectId(id)
        }, {
          $set: {
            'colors': colors
          }
        })
      })

  }


  setTag(productId, body) {

    if (!productId)
      return Promise.reject(error.productIdRequired);
    if (!body.tagId)
      return Promise.reject(error.productTagIdRequired);

    return models['Tag' + (Product.test ? 'Test' : '')].aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(body.tagId)
        }
      },
      {
        $lookup: {
          from: 'tag_group',
          localField: 'tag_group_id',
          foreignField: '_id',
          as: 'tag_group'
        }
      },
      {
        $unwind: { // unwind tag_group to get object instead of array
          path: '$tag_group',
          preserveNullAndEmptyArrays: true
        }
      },
    ])
      .then(res => {
        if (!res[0])
          return Promise.reject(error.tagNotFound);

        return this.ProductModel.update({
            '_id': mongoose.Types.ObjectId(productId),
            'tags.tag_id': {$ne: res[0]._id}
          },
          {
            $addToSet: {
              'tags': {name: res[0].name, tg_name: res[0].tag_group.name, tag_id: res[0]._id}
            }
          });
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
        '_id': mongoose.Types.ObjectId(id),
      },
      {
        $pull: {
          'tags': {
            'tag_id': mongoose.Types.ObjectId(tagId)
          }
        }
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
          $project: {
            'name': 1,
            'base_price': 1,
            'brand.name': 1,
            'product_type.name': 1,
            'colors': 1,
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
            $count: 'count'
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
          from: 'product_type',
          localField: 'product_type',
          foreignField: '_id',
          as: 'product_type'
        },
      }, {
        $unwind: {
          path: '$product_type',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'brand',
          localField: 'brand',
          foreignField: '_id',
          as: 'brand'
        },
      }, {
        $unwind: {
          path: '$brand',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $project: {
          'name': 1,
          'product_type': '$product_type.name',
          'brand': '$brand.name',
        }
      }
    ]).limit(5).sort({name: 1});
  }

  setReview(body, pid, user) {
    pid = pid.trim();

    if (!user) {
      return Promise.reject(error.noUser);
    }
    if (_.isEmpty(body)) {
      return Promise.reject(error.bodyRequired);
    }
    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return Promise.reject(error.invalidId);
    }

    return this.ProductModel.findOne({
      '_id': mongoose.Types.ObjectId(pid),
      'reviews.customer_id': mongoose.Types.ObjectId(user.id)
    }).then(_product => {
      if (!_product) {
        return this.ProductModel.update({
          '_id': mongoose.Types.ObjectId(pid),
        }, {
          $addToSet: {
            'reviews': {
              customer_id: mongoose.Types.ObjectId(user.id),
              stars_count: body.stars_count,
              brand: body.brand,
              comment: body.comment
            }
          }
        });
      } else {
        return this.ProductModel.update({
          '_id': mongoose.Types.ObjectId(pid),
          'reviews.customer_id': mongoose.Types.ObjectId(user.id)
        }, {
          $set: {
            'reviews.$.stars_count': body.stars_count,
          }
        });
      }
    });

  }

  unSetReview(body, params, user) {
    let pid = params.pid.trim();
    let rid = params.rid.trim();

    if (!user) {
      return Promise.reject(error.noUser);
    }

    if (!mongoose.Types.ObjectId.isValid(pid)) {
      return Promise.reject(error.invalidId);
    }
    if (!mongoose.Types.ObjectId.isValid(rid)) {
      return Promise.reject(error.invalidId);
    }

    return this.ProductModel.update({}, {$pull: {reviews: {_id: mongoose.Types.ObjectId(rid)}}});

  }
}

Product
  .test = false;

module
  .exports = Product;
