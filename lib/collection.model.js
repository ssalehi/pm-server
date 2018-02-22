/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Collection extends Base {

  constructor(test = Collection.test) {

    super('Collection', test);

    this.CollectionModel = this.model;
  }

  setCollection(body) {
    if (!body.name) return Promise.reject(error.CollectionNameRequired);
    if (body._id) {
      return this.CollectionModel.update({_id: body._id}, body, {upsert: true});
    } else {
      return this.CollectionModel.create(body);
    }
  }

  deleteCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.findByIdAndRemove(cid);
  }

  getCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {$match: {_id: mongoose.Types.ObjectId(cid)}},
      //product info
      {
        $lookup: {
          from: 'products',
          localField: 'productIds',
          foreignField: '_id',
          as: 'products'
        }
      },
      {
        $unwind: {
          path: '$products',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: 'products.brand',
          foreignField: '_id',
          as: 'brand'
        }
      },
      {
        $unwind: {
          path: '$brand',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'producttypes',
          localField: 'products.product_type',
          foreignField: '_id',
          as: 'product_type'
        }
      },
      {
        $unwind: {
          path: '$product_type',
          preserveNullAndEmptyArrays: true
        }
      },
      //get other details
      {
        $lookup: {
          from: 'producttypes',
          localField: 'typeIds',
          foreignField: '_id',
          as: 'types'
        }
      },
      {
        $lookup: {
          from: 'tags',
          localField: 'tagIds',
          foreignField: '_id',
          as: 'tags'
        }
      },
      {
        $lookup: {
          from: 'taggroups',
          localField: 'tagGroupIds',
          foreignField: '_id',
          as: 'tagGroups'
        }
      },
      //gather up
      {
        $group: {
          _id: "$_id",
          name: {"$first": "$name"},
          is_smart: {"$first": "$is_smart"},
          types: {"$first": "$types"},
          tags: {"$first": "$tags"},
          tagGroups: {"$first": "$tagGroups"},
          products: {
            $push: {
              _id: "$products._id",
              name: "$products.name",
              base_price: "$products.base_price",
              brand: "$brand.name",
              product_type: "$product_type.name"
            }
          }
        }
      },
      {
        $project: {
          name: 1,
          is_smart: 1,
          products: 1,
          types: "$types",
          tags: "$tags",
          tagGroups: "$tagGroups"
        }
      }
    ]).then(res => {
      if (res[0].products)
        if (res[0].products.length === 1)
          if (!res[0].products[0]._id)
            res[0].products = [];

      return Promise.resolve(res);
    });
  }

  deleteProductFromCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(params.pid)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: params.cid}, {$pull: {'productIds': params.pid}});
  }

  setProductToCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(params.pid)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: params.cid}, {$push: {'productIds': params.pid}});
  }

  /**
   * @params:
   * cid: collection id
   * tid: tag id
   * @return {Promise.<*>}
   * */
  deleteTagFromCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(params.tid)) return Promise.reject(error.tagIdIsNotValid);

    return this.CollectionModel.update({_id: params.cid}, {$pull: {'tagIds': params.tid}});
  }

  /**
   * @param params
   * cid: collection id
   * tid: tag id
   * @returns {Promise.<*>}
   */
  setTagToCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(params.tid)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: params.cid}, {$push: {'tagIds': params.tid}});
  }

  /**
   * @param cid: collection id
   * @param body:
   * typeIds: updated type ids
   * tagGroupIds: updated tag group ids
   * NOTE: this body will overwrite the previous typeIds and tagGroupIds!
   * @returns {Promise.<*>}
   */
  updateDetails(cid, body) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, body);
  }

  search(options, offset, limit) {
    let result;
    return this.CollectionModel.find({name: {$regex: options.phrase, $options: 'i'}}, {name: 1, is_smart: 1})
      .skip(offset)
      .limit(limit)
      .select({"name": 1}).then(res => {
        result = res;
        return this.CollectionModel.find({name: {$regex: options.phrase, $options: 'i'}}, {
          name: 1,
          is_smart: 1
        }).count();
      }).then(res => {
        return Promise.resolve({
          data: result,
          total: res,
        })
      })
  }

}

Collection.test = false;

module.exports = Collection;