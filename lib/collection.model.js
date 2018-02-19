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

  getAllCollection() {
    return this.CollectionModel.find({}, {name: 1, image_url: 1,});
  }

  getCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {_id: mongoose.Types.ObjectId(cid)}
      }, {
        $lookup: {
          from: 'products',
          localField: 'productIds',
          foreignField: '_id',
          as: 'products'
        }
      }, {
        $unwind: {
          path: '$products',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'brands',
          localField: 'products.brand',
          foreignField: '_id',
          as: 'brand'
        }
      }, {
        $unwind: {
          path: "$brand",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'producttypes',
          localField: 'products.product_type',
          foreignField: '_id',
          as: 'product_type'
        }
      }, {
        $unwind: {
          path: "$product_type",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $group: {
          _id: {_id: "$_id", name: "$name", image_url: "$image_url"},
          products: {
            $push: {
              _id: "$products._id",
              name: "$products.name",
              base_price: "$products.base_price",
              brand: "$brand.name",
              product_type: "$product_type.name",
            }
          }
        }
      }, {
        $project: {
          _id: 0,
          'collection': "$_id",
          products: 1
        }
      }]);
  }

  deleteCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.findByIdAndRemove(cid);
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

  getProductsFromCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {_id: mongoose.Types.ObjectId(cid)}
      }, {
        $lookup: {
          from: 'products',
          localField: 'productIds',
          foreignField: '_id',
          as: 'products'
        }
      }, {
        $unwind: {
          path: '$products',
          preserveNullAndEmptyArrays: true
        }
      }, {
        $lookup: {
          from: 'brands',
          localField: 'products.brand',
          foreignField: '_id',
          as: 'brand'
        }
      }, {
        $unwind: {
          path: "$brand",
        }
      }, {
        $lookup: {
          from: 'producttypes',
          localField: 'products.product_type',
          foreignField: '_id',
          as: 'product_type'
        }
      }, {
        $unwind: {
          path: "$product_type"
        }
      }, {
        $group: {
          _id: {_id: "$_id", name: "$name", image_url: "$image_url"},
          products: {
            $push: {
              _id: "$products._id",
              name: "$products.name",
              base_price: "$products.base_price",
              brand: "$brand.name",
              product_type: "$product_type.name",
            }
          }
        }
      }, {
        $project: {
          _id: 0,
          'collection': "$_id",
          products: 1
        }
      }]);
  }

  searchCollection(body) {

    let offset = body.options && body.options.offset ? body.options.offset : 0;
    let limit = body.options && body.options.limit ? body.options.limit : 10;

    return this.CollectionModel.find({name: {$regex: body.phrase, $options: 'i'}}).skip(offset).limit(limit);
  }

}

Collection.test = false;

module.exports = Collection;