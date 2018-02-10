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
    return this.CollectionModel.update({name: body.name}, body, {upsert: true});
  }

  getAllCollection() {
    return this.CollectionModel.find({});
  }

  getCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    return this.CollectionModel.findById(cid);

    // return this.CollectionModel.aggregate([
    //   {
    //     $match: {_id: mongoose.Types.ObjectId(cid)}
    //   },
    //   {
    //     $lookup: {
    //       from: 'products',
    //       localField: 'productIds',
    //       foreignField: '_id',
    //       as: 'productsArr',
    //       pipeline: [{
    //         $lookup: {
    //           from: 'brands',
    //           localField: 'brand',
    //           foreignField: '_id',
    //           as: 'brandNew'
    //         }
    //       }]
    //     }
    //   }, {
    //     $unwind: {
    //       path: '$productsArr',
    //       preserveNullAndEmptyArrays: true
    //     }
    //   }, {
    //     $group: {
    //       _id: "$_id",
    //       products: {$push: "$productsArr"}
    //     }
    //   }
    // ]).then(res => {
    //   console.log("getCollection@@@", JSON.stringify(res, null, 2));
    // });
  }

  deleteCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.findByIdAndRemove(params.cid);
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

  getProductsFromCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    return this.CollectionModel.aggregate([
      {
        $match: {_id: mongoose.Types.ObjectId(params.cid)}
      }, {
        $lookup: {
          from: 'products',
          localField: 'productIds',
          foreignField: '_id',
          as: 'products'
        }
      }, {
        $unwind: {
          path: "$products",
          preserveNullAndEmptyArrays: true
        }
      }, {
        $group: {
          _id: "$_id",
          products: {$push: {name: "$products.name", price: "$products.base_price"}}
        }
      }
    ]);
  }

}

Collection.test = false;

module.exports = Collection;