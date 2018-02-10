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
  }

  deleteCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    return this.CollectionModel.findByIdAndRemove(params.cid);
  }

  deleteProductFromCollection(params) {
    return this.CollectionModel.update({_id: params.cid}, {$pull: {'productIds': params.pid}});
  }

  setProductToCollection(params) {
    if (!mongoose.Types.ObjectId(params.cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(params.pid)) return Promise.reject(error.productIdIsNotValid);
    return this.CollectionModel.update({_id: params.cid}, {$push: {'productIds': params.pid}});
  }

  getProductsFromCollection(params) {
    return this.CollectionModel.findById(params.cid, 'productIds');

  }

}

Collection.test = false;

module.exports = Collection;