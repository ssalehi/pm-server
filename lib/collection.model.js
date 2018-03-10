/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');
const ProductModel = require('./product.model');

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
      if (!body['is_smart'])
        body['is_smart'] = false;
      return this.CollectionModel.create(body);
    }
  }

  deleteCollection(cid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    return this.CollectionModel.findByIdAndRemove(cid);
  }

  getProductsByPageAddress(address) {
    if (!address) return Promise.reject(error.pageAddressRequired);
    return models['Page' + (Collection.test ? 'Test' : '')].findOne({address}).lean()
      .then(res => {

        if (res.page_info && res.page_info.collection_id) {
          if (res.is_app)
            return this.getProducts(res.page_info.collection_id);
          else
            return Promise.reject(error.appOnly);

        } else {
          return Promise.reject(error.collectionIdIsNotValid);
        }
      })
  }

  getCollectionProducts(collectionId) {

    if (!mongoose.Types.ObjectId(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.getProducts(collectionId);
  }

  getProducts(collectionId) {

    let collectionName, collectionIsSmart;

    return this.CollectionModel.findById(collectionId).lean()
      .then(res => {

        collectionName = res.name;
        collectionIsSmart = res.is_smart;

        return (new ProductModel(Collection.test)).getProductsByIdsTypeTag(res.productIds, res.typeIds, res.tagIds);
      })
      .then(res => {
        return Promise.resolve({
          _id: collectionId,
          name: collectionName,
          is_smart: collectionIsSmart,
          products: res
        })
      })
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
    let match = {
      name: {$regex: options.phrase, $options: 'i'},
    };
    if (options.is_smart === true || options.is_smart === false)
      match['is_smart'] = options.is_smart === true ? "true" : "false";
    return this.CollectionModel.find(match, {name: 1, is_smart: 1})
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

  suggest(phrase) {
    return this.CollectionModel.find({name: {$regex: phrase, $options: 'i'}}, {name: 1})
      .limit(5).sort({name: 1});
  }
}

Collection.test = false;

module.exports = Collection;
