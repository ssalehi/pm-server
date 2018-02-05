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
    if (!body.name) {
      return Promise.reject(error.nameRequired);
    }
    let collection = new this.CollectionModel(body);
    return collection.save();
  }

  getCollection() {
    return this.CollectionModel.find({});
  }

  deleteCollection(params) {
    return this.CollectionModel.findByIdAndRemove({_id: params.cid});
  }

  deleteProductFromCollection(params) {
    // return this.CollectionModel.update({_id: params.cid}, {$pull: {'productIds': {_id: params.pid}}});
    // this.CollectionModel.findById({_id: params.cid}).then(res => {
    //   console.log("res", res);
    //   if (!Array.isArray(res.productIds)) {
    //     return Promise.reject('can not delete product from collection');
    //   }
    //   res.productIds.forEach((item, index) => {
    //     if (item.toString() === params.pid) {
    //     }
    //   });
    // });
  }


}

Collection.test = false;

module.exports = Collection;