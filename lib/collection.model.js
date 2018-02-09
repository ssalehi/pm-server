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

  createCollection(body) {
    return this.CollectionModel.create(body);

  }

  getAllCollection() {
    let pipeline = [];
    this.CollectionModel.aggregate(pipeline).then(res => {
      console.log("getAllCollection@@:", res);
    });
  }


  getCollection(cid) {
    return new Promise((resolve, reject) => {
      this.CollectionModel.findById(cid).then(res => {
        resolve(res);
      }).catch(err => {
        if (err) reject(err);
      });
    });
  }

  deleteCollection(params) {
    return this.CollectionModel.findByIdAndRemove({_id: params.cid});
  }

  deleteProductFromCollection(params) {
    return this.CollectionModel.update({_id: params.cid}, {$pull: {'productIds': params.pid}});
  }

  addedProductToCollection(params) {
    return this.CollectionModel.update({_id: params.cid}, {$push: {'productIds': params.pid}});
  }

  getProductsFromCollection(params) {
    return this.CollectionModel.findById(params.cid, 'productIds');

  }

}

Collection.test = false;

module.exports = Collection;