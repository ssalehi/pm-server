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
    for (let key in params) {
      if (params[key] === '') return Promise.reject(error.paramsRequired);
      const pid = mongoose.Types.ObjectId(params.pid);
      return new Promise((resolve, reject) => {
        this.CollectionModel.update({_id: params.cid}, {$pull: {'productIds': pid}}).then(res => {
          resolve(res);
        }).catch(err => {
          reject(err);
        });
      });
    }
  }

  addedProductToCollection(params) {
    // this.CollectionModel.find().then(res => {
    //   console.log('addedProductToCollection', res);
    // });
    return this.CollectionModel.update({_id: params.cid}, {$push: {'productIds': params.pid}});
  }

  getProductsFromCollection(params) {
    return new Promise((resolve, reject) => {
      this.CollectionModel.findById(params.cid, 'productIds').then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      });
    });


  }

}

Collection.test = false;

module.exports = Collection;