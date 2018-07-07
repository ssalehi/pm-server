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
const SoldOutModel = require('./sold_out.model');

class Product extends Base {

  constructor(test = Product.test) {

    super('Product', test);

    this.ProductModel = this.model;
  }

  getProduct(id) {
    id = id.trim();
    if (!mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.invalidId);

    return this.getProducts([id], null, null, null, true).then(r => Promise.resolve(r[0]));
  }

  getInstance(productId, productInstanceId, returnProduct = false) {
    return this.ProductModel.findOne({
      _id: mongoose.Types.ObjectId(productId),
    }, 'instances base_price').lean()
      .then(res => {
        if (res && res.instances) {
          let instance = res.instances.find(x => x._id.toString() === productInstanceId);

          if (returnProduct) {
            delete res.instances;
            return Promise.resolve(Object.assign(res, {instance}));
          }

          return Promise.resolve(instance);
        } else
          return Promise.resolve();
      })
  }

  getInstanceByBarcode(barcode) {
    if (!barcode)
      return Promise.reject(error.barcodeNotFound);

    return this.ProductModel.findOne({
      'instances.barcode': barcode
    }, 'instances colors name').lean()
      .then(res => {
        if (res && res.instances) {
          let instance = res.instances.find(x => x.barcode === barcode);
          delete res.instances;
          return Promise.resolve(Object.assign(res, {instance}));
        } else
          return Promise.reject(error.productNotFound);
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

  getProducts(productIds, typeIds, tagIds, brandIds, overrideSoldOut = false) {
    let queryArray = [];
    if (productIds && productIds.length)
      queryArray.push({'_id': {$in: productIds.map(x => mongoose.Types.ObjectId(x))}});

    let andQueryArray = [];
    if (brandIds && brandIds.length) {
      andQueryArray.push({'brand.brand_id': {$in: brandIds.map(x => mongoose.Types.ObjectId(x))}});
    }
    if (typeIds && typeIds.length)
      andQueryArray.push({'product_type.product_type_id': {$in: typeIds.map(x => mongoose.Types.ObjectId(x))}});

    if (tagIds && tagIds.length)
      andQueryArray.push({'tags.tag_id': {$in: tagIds.map(x => mongoose.Types.ObjectId(x))}});

    if (!queryArray.length && !andQueryArray)
      return Promise.resolve([]);

    if (andQueryArray.length)
      queryArray.push({$and: andQueryArray});

    if (!queryArray.length)
      queryArray.push({true: true});


    let preQuery = [{
      $match: {
        $or: queryArray
      }
    }];

    let soldOutQuery = overrideSoldOut ? [] :
      [
        {
          $unwind: {
            path: '$instances', // unwind campaign ids to look up for campaigns and discounts
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {'instances.sold_out': false}
        },
        {
          $group: {
            _id: '$_id',
            instances: {$push: '$instances'},
            date: {$first: '$date'},
            name: {$first: '$name'},
            product_type: {$first: '$product_type'},
            brand: {$first: '$brand'},
            base_price: {$first: '$base_price'},
            colors: {$first: '$colors'},
            tags: {$first: '$tags'},
            campaigns: {$first: '$campaigns'},
            desc: {$first:'$desc'}
          }
        }
      ];

    let postQuery = [{
      $unwind: {
        path: '$campaigns', // unwind campaign ids to look up for campaigns and discounts
        preserveNullAndEmptyArrays: true
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
        path: '$campaign', // unwind campaign to look up for campaigns and discounts
        preserveNullAndEmptyArrays: true
      }
    }
      ,
    {
      $project: {
        _id: 1,
        date: 1,
        name: 1,
        product_type: 1,
        brand: 1,
        base_price: 1,
        campaign: 1,
        tags: 1,
        colors: 1,
        instances: 1,
        desc: 1,
        discount:
          {
            $cond: [
              {
                '$and': [
                  {$gt: ['$campaign.end_date', new Date()]},
                  {$lt: ['$campaign.start_date', new Date()]},
                ]
              },
              '$campaign.discount_ref'
              ,
              0
            ]
          }

      }
    }
      ,
    {
      $group: {
        _id: '$_id',
        date: {$first: '$date'},
        name: {$first: '$name'},
        product_type: {$first: '$product_type.name'},
        brand: {$first: '$brand.name'},
        base_price: {$first: '$base_price'},
        colors: {$first: '$colors'},
        discount: {$max: '$discount'},
        instances: {$first: '$instances'},
        tags: {$first: '$tags'},
        desc: {$first:'$desc'},
        campaigns: {
          $push: {
            '_id': '$campaign._id',
            'discount_ref': '$campaign.discount_ref',
            'start_date': '$campaign.start_date',
            'end_date': '$campaign.end_date'
          }
        }
      }
    }];

    return this.ProductModel.aggregate(preQuery.concat(soldOutQuery, postQuery));
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
              $and: [
                {'campaign.end_date': {$gte: new Date()}},
                {'campaign.start_date': {$lte: new Date()}}
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


    let foundInstance;
    return this.ProductModel.findById(mongoose.Types.ObjectId(body.id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound);

        foundInstance = res.instances.find(x => x._id.toString() === body.productInstanceId.toString());
        if (!foundInstance)
          return Promise.reject(error.productInstanceNotExist);

        const initialInstance = JSON.parse(JSON.stringify(foundInstance));

        if (Number.parseInt(body.price))
          foundInstance.price = Number.parseInt(body.price);


        let foundInventory = foundInstance.inventory.find(i => i.warehouse_id.toString() === body.warehouseId.toString());
        // when this function is called by ORP setAutomatedTicket and invenotry not exist for product it should be resolved to set a NotExist ticket for central warehouse 
        if (!foundInventory) {
          return Promise.resolve();
        }
        // resereved number should be changed before count 
        let delReserved = Number.parseInt(body.delReserved);
        if (delReserved && foundInventory.reserved + delReserved >= 0 && foundInventory.reserved + delReserved <= foundInventory.count) {
          foundInventory.reserved += delReserved;
        }

        // count number should be changed after reserved 
        let delCount = Number.parseInt(body.delCount);
        let count = Number.parseInt(body.count);
        if (delCount && foundInventory.count + delCount >= 0 && foundInventory.count + delCount >= foundInventory.reserved) {
          foundInventory.count += delCount;
        } else if (count >= 0 && count >= foundInventory.reserved) {
          foundInventory.count = count;
        }


        if (foundInventory.count < foundInventory.reserved || foundInventory.count < 0 || foundInventory.reserved < 0)
          return Promise.reject(error.invalidInventoryCount);


        return this.checkSoldOutStatus(body.id, initialInstance, foundInstance);
      })
      .then(res => {
        foundInstance.sold_out = false;
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

  checkSoldOutStatus(productId, initialInstance, changedInstance) {

    const totalInitialCount = initialInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    const totalChangedCount = changedInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    if (totalChangedCount === 0) {
      return new SoldOutModel(Product.test).insertProductInstance(productId, initialInstance._id.toString());
    }
    else if (totalInitialCount === 0 && totalChangedCount > 0) {
      return new SoldOutModel(Product.test).removeProductInstance(productId, initialInstance._id.toString())
    }

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
   *  productColorId: id of color in colors array in product
   *  is_thumbnail: true/false checks if this is thumbnail or angles
   *  fileData data of uploaded file.
   * @returns {Promise.<*>}
   */
  setImage(id, productColorId, is_thumbnail, fileData) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!productColorId)
      return Promise.reject(error.productColorIdRequired);
    if (!fileData || fileData.path === 0)
      return Promise.reject(error.badUploadedFile);

    is_thumbnail = is_thumbnail === 'true';

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(productColorId))
      return Promise.reject(error.invalidId);

    let product, foundColor, colors, preThumb;

    return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound);

        let update;
        let foundProductColor = res.colors.find(x => x._id.toString() === productColorId);


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

        colors = res.colors
        if (is_thumbnail && preThumb) {
          return rmPromise([env.uploadProductImagePath, id, productColorId, preThumb].join(path.sep));
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
   *  productColorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  removeColor(id, productColorId) {
    if (!id)
      return Promise.reject(error.productIdRequired);
    if (!productColorId)
      return Promise.reject(error.productColorIdRequired);

    return this.ProductModel.update({
      '_id': mongoose.Types.ObjectId(id),
    },
      {
        $pull: {
          'colors': {
            '_id': mongoose.Types.ObjectId(productColorId)
          }
        }
      })
      .then(res => {
        if (res.n === 1 && res.nModified === 1) {
          return rmPromise([env.uploadProductImagePath, id, productColorId].join(path.sep))
        }
        else
          return Promise.reject(error.ProudctImageRemoveFailed)
      })
  }

  /**
   * @param:
   *  id : id of product
   *  productColorId: id of color inside the colors array
   * @returns {Promise.<*>}
   */
  removeImage(id, productColorId, angle) {
    if (!id || !mongoose.Types.ObjectId.isValid(id))
      return Promise.reject(error.productIdRequired);
    if (!productColorId || !mongoose.Types.ObjectId.isValid(productColorId))
      return Promise.reject(error.productColorIdRequired);
    if (!angle)
      return Promise.reject(error.productImageNameRequired);

    let colors;
    return this.ProductModel.findById(mongoose.Types.ObjectId(id)).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.productNotFound)

        let foundProductColor = res.colors.find(x => x._id.toString() === productColorId);
        if (!foundProductColor)
          return Promise.reject(error.productColorNotExist);

        let index = foundProductColor.image.angles.findIndex(x => x === angle);
        if (index >= 0)
          foundProductColor.image.angles.splice(index, 1);


        colors = res.colors;

        return rmPromise([env.uploadProductImagePath, id, productColorId, angle].join(path.sep))

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
          $unwind: {
            path: '$tags',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$instances',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $match: {
            $or: [
              {name: {$regex: options.phrase, $options: 'i'}},
              {'brand.name': {$regex: options.phrase, $options: 'i'}},
              {'tags.name': {$regex: options.phrase, $options: 'i'}},
              {'instances.article_no': {$regex: options.phrase, $options: 'i'}}
            ]
          }
        },
        {
          $project: {
            'name': 1,
            'base_price': 1,
            'brand.name': 1,
            'product_type.name': 1,
            'colors': 1,
            'tags': 1,
            'instances.article_no': 1,
          }
        },
        {
          $group: {
            _id: '$_id',
            name: {$first: '$name'},
            base_price: {$first: '$base_price'},
            brand: {$first: '$brand'},
            product_type: {$first: '$product_type'},
            colors: {$first: '$colors'},
            tags: {$first: '$tags'},
            instances: {$first: '$instances'},
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
            $unwind: {
              path: '$tags',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              $or: [
                {name: {$regex: options.phrase, $options: 'i'}},
                {'brand.name': {$regex: options.phrase, $options: 'i'}},
                {'tags.name': {$regex: options.phrase, $options: 'i'}},
                {'instances.article_no': {$regex: options.phrase, $options: 'i'}}
              ]
            }
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

  addRemoveCampaign(productId, campaignId, isAdd) {

    if (!productId || !mongoose.Types.ObjectId.isValid(productId) ||
      !campaignId || !mongoose.Types.ObjectId.isValid(campaignId))
      return Promise.reject(error.invalidId);

    let update = isAdd ?
      {
        $addToSet: {
          campaigns: mongoose.Types.ObjectId(campaignId)
        }
      } :
      {
        $pull: {
          campaigns: mongoose.Types.ObjectId(campaignId)
        }
      };

    return this.ProductModel.update({
      _id: mongoose.Types.ObjectId(productId)
    }, update);
  }

  setSoldOutFlag(productId, productInstanceId, isSoldOut) {

    return this.ProductModel.update({
      _id: mongoose.Types.ObjectId(productId),
      'instances._id': mongoose.Types.ObjectId(productInstanceId)
    }, {
        $set: {
          'instances.$.sold_out': isSoldOut
        }
      });
  }
}

Product
  .test = false;

module
  .exports = Product;
