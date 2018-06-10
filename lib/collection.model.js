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

  getCollection(collectionId) {

    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.findOne({_id: collectionId}).select('name name_fa')
  }

  setCollection(body, id) {
    if (!body.name || !body.name_fa)
      return Promise.reject(error.CollectionNameRequired);


    if (!id) {
      let newCollection = new this.CollectionModel({
        name: body.name,
        name_fa: body.name_fa
      });
      return newCollection.save();
    } else {
      return this.CollectionModel.findOneAndUpdate({
        '_id': mongoose.Types.ObjectId(id),
      },
        {
          $set: {
            'name': body.name,
            'name_fa': body.name_fa,
          }
        }, {new: true});
    }
  }

  deleteCollection(cid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    return this.CollectionModel.findByIdAndRemove(cid);
  }

  getProductsByPageAddress(address) {
    console.log('--->> : debugging');
    if (!address) return Promise.reject(error.pageAddressRequired);
    return models['Page' + (Collection.test ? 'Test' : '')].findOne({address}).lean()
      .then(res => {

        if (!res)
          return Promise.reject(error.pageNotFound);

        if (res && res.page_info && res.page_info.collection_id) {
          if (res.is_app)
            return this.getProducts(res.page_info.collection_id);
          else
            return Promise.reject(error.appOnly);

        } else {
          return Promise.reject(error.pageInfoError);
        }
      })
  }

  getCollectionProducts(collectionId) {

    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.getProducts(collectionId);
  }

  /**
   * this function is used just for admin panel when admin wants to see
   * products of collection which he/she added by product id.
   * @param collectionId
   */
  getCollectionManualProducts(collectionId) {
    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.getProducts(collectionId, true);
  }

  /**
   * @param collectionId
   * @param manualProducts: (default is false) is used when admin wants to get only products of collection which are added by product id
   *
   */
  getProducts(collectionId, manualProducts = false) {

    let collectionName, collectionNameFa;

    return this.CollectionModel.findById(collectionId).lean()
      .then(res => {
        if (res.productIds.length !== 0 || res.tagIds !== 0 || res.typeIds !== 0) {
          collectionName = res.name;
          collectionNameFa = res.name_fa;

          let productIds = [];
          let typeIds = [];
          let tagIds = [];
          let brandIds = [];

          if (res.productIds && res.productIds.length)
            productIds = res.productIds;

          if (res.typeIds && res.typeIds.length && !manualProducts)
            typeIds = res.typeIds;

          if (res.tagIds && res.tagIds.length && !manualProducts)
            tagIds = res.tagIds;

          if (res.brandIds && res.brandIds.length && !manualProducts)
            brandIds = res.brandIds;

          if (productIds.length === 0 && typeIds.length === 0 && tagIds.length === 0)
            return Promise.resolve([]);

          return (new ProductModel(Collection.test)).getProducts(productIds, typeIds, tagIds, brandIds, manualProducts); // override sold out search
        }
        else
          return Promise.resolve([])
      })
      .then(res => {
        return Promise.resolve({
          _id: collectionId,
          name: collectionName,
          name_fa: collectionNameFa,
          products: res
        })
      })

  }

  setProductToCollection(cid, productId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'productIds': productId}})
      .then(res => {
        // Get campaign ids related to this collection        
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].findOneAndUpdate({
          _id: productId,
        }, {
            $addToSet: {
              campaigns: res.map(el => el._id)
            }
          });
      })
      .then(res => Promise.resolve(res));
  }

  deleteProductFromCollection(cid, productId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'productIds': productId}})
      .then(res => {
        // Get campaign ids related to this collection
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].update({
          _id: productId,
        }, {
            $pull: {
              campaigns: {$in: res.map(el => el._id)}
            }
          });
      })
      .then(res => Promise.resolve(res));
  }

  getCollectionTags(collectionId) {
    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(collectionId),
          'tagIds': {$exists: true, $not: {$size: 0}}
        }
      },
      {
        $lookup: {
          from: 'tag',
          localField: 'tagIds',
          foreignField: '_id',
          as: 'tag'
        }
      },
      {
        $unwind: {
          path: '$tag',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'tag_group',
          localField: 'tag.tag_group_id',
          foreignField: '_id',
          as: 'tag_group'
        }
      },
      {
        $unwind: {
          path: '$tag_group',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$_id',
          tags: {
            $push: {
              _id: '$tag._id',
              name: '$tag.name',
              tg_name: '$tag_group.name'
            }
          }

        }
      }
    ])
      .then(res => {
        if (res && res.length > 0)
          return Promise.resolve(res[0]);
        else
          return Promise.resolve();
      })

  }

  setTagToCollection(cid, tagId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tagId)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'tagIds': tagId}})
      .then(res => {
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].update({
          'tags.tag_id': {$in: [tagId]},
        }, {
            $addToSet: {
              campaigns: res.map(el => el._id)
            }
          }, {
            multi: true,
          });
      })
      .then(res => Promise.resolve(res));
  }

  deleteTagFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tid)) return Promise.reject(error.tagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'tagIds': tid}})
      .then(res => {
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].update({
          'tags.tag_id': {$in: [tid]},
        }, {
            $pull: {
              campaigns: {$in: res.map(el => el._id)}
            }
          }, {
            multi: true,
          });
      })
      .then(res => Promise.resolve(res));
  }

  getCollectionTypes(collectionId) {
    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(collectionId),
          'typeIds': {$exists: true, $not: {$size: 0}}
        }
      },
      {
        $lookup: {
          from: 'product_type',
          localField: 'typeIds',
          foreignField: '_id',
          as: 'types'
        }
      },
      {
        $project: {
          'types': 1
        }
      }
    ]).then(res => {
      if (res && res.length > 0)
        return Promise.resolve(res[0]);
      else
        return Promise.resolve();
    })

  }

  setTypeToCollection(cid, typeId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(typeId)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'typeIds': typeId}})
      .then(res => {
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].update({
          'product_type.product_type_id': {$in: [typeId]}
        }, {
            $addToSet: {
              campaigns: res.map(el => el._id)
            }
          }, {
            multi: true
          });
      })
      .then(res => Promise.resolve(res));
  }

  deleteTypeFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tid)) return Promise.reject(error.typeIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'typeIds': tid}})
      .then(res => {
        return models['Campaign' + (Collection.test ? 'Test' : '')].find({collection_ids: {$in: [cid]}});
      })
      .then(res => {
        return models['Product' + (Collection.test ? 'Test' : '')].update({
          'product_type.product_type_id': {$in: [tid]}
        }, {
            $pull: {
              campaigns: {$in: res.map(el => el._id)}
            }
          }, {
            multi: true,
          });
      })
      .then(res => Promise.resolve(res));
  }

  search(options, offset, limit) {
    let result;
    let match = {
      $or: [{name: {$regex: options.phrase, $options: 'i'}}, {name_fa: {$regex: options.phrase, $options: 'i'}}]
    };
    if (options.is_smart === true || options.is_smart === false)
      match['is_smart'] = options.is_smart === true ? 'true' : 'false';
    return this.CollectionModel.find(match, {name: 1, name_fa: 1, is_smart: 1})
      .skip(offset)
      .limit(limit)
      .select({'name': 1, 'name_fa': 1}).then(res => {
        result = res;
        return this.CollectionModel.find({$or: [{name: {$regex: options.phrase, $options: 'i'}}, {name_fa: {$regex: options.phrase, $options: 'i'}}]}, {
          name: 1,
          name_fa: 1,
          is_smart: 1
        }).count();
      })
      .then(res => {
        return Promise.resolve({
          data: result,
          total: res,
        })
      })
  }

  getCollectionPages(body) {
    if (!body.collection_id) return Promise.reject(error.collectionIdIsNotValid);
    return models['Page' + (Collection.test ? 'Test' : '')].find({
      "page_info.collection_id": body.collection_id
    })
      .then(res => {
        if (!res)
          return Promise.reject(error.pageNotFound);
        else {
          return Promise.resolve(res);
        }
      })
  }

  suggest(phrase) {
    return this.CollectionModel.find({name: {$regex: phrase, $options: 'i'}}, {name: 1})
      .limit(5).sort({name: 1});
  }
}

Collection.test = false;

module.exports = Collection;
