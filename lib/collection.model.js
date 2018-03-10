/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const models = require('../mongo/models.mongo');

class Collection extends Base {

  constructor(test = Collection.test) {

    super('Collection', test);

    this.CollectionModel = this.model;
  }


  getCollection(collectionId) {

    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.findOne({_id: collectionId})
  }


  setCollection(body, id) {
    if (!body.name)
      return Promise.reject(error.CollectionNameRequired);

    if (!id) {
      let newCollection = new this.CollectionModel({
        name: body.name,
      });
      return newCollection.save();
    } else {
      return this.CollectionModel.findOneAndUpdate({
          "_id": mongoose.Types.ObjectId(id),
        },
        {
          $set: {
            'name': body.name,
          }
        }, {new: true});
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

    if (!mongoose.Types.ObjectId(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.getProducts(collectionId);
  }

  /**
   * this function is used just for admin panel when admin wants to see
   * products of collection which he/she added by product id.
   * @param collectionId
   */
  getCollectionManualProducts(collectionId) {
    if (!mongoose.Types.ObjectId(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.getProducts(collectionId, true);
  }

  /**
   * @param collectionId
   * @param manualProducts: (default is false) is used when admin wants to get only products of collection which are added by product id
   *
   */
  getProducts(collectionId, manualProducts = false) {

    let collectionName;

    return this.CollectionModel.findById(collectionId).lean()
      .then(res => {


        if (res.productIds.length !== 0 || res.tagIds !== 0 || res.typeIds !== 0) {
          collectionName = res.name;

          let queryArray = [];
          if (res.productIds && res.productIds.length > 0)
            queryArray.push({"_id": {$in: res.productIds}});

          if (res.typeIds && res.typeIds.length > 0 && !manualProducts)
            queryArray.push({"product_type": {$in: res.typeIds}});

          if (res.tagIds && res.tagIds.length > 0 && !manualProducts)
            queryArray.push({"tags": {$in: res.tagIds}});

          return models['Product' + (Collection.test ? 'Test' : '')].aggregate([
            {
              $match: {
                $or: queryArray
              }
            },
            {
              $lookup: {
                from: 'brand',
                localField: 'brand',
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
                from: 'product_type',
                localField: 'product_type',
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
            {
              $unwind: {
                path: '$colors',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'color',
                localField: 'colors.color_id',
                foreignField: '_id',
                as: "color"
              }
            },
            {
              $unwind: { // unwind colors to get object instead of array in group stage
                path: '$color',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: "$_id",
                date: {$first: "$date"},
                name: {$first: "$name"},
                product_type: {$first: "$product_type"},
                brand: {$first: "$brand"},
                base_price: {$first: "$base_price"},
                instances: {$first: "$instances"},
                tags: {$first: "$tags"},
                colors: {
                  $push: {
                    name: "$color.name",
                    images: "$colors.images"
                  }
                },
              }
            },
            {
              $unwind: {
                path: '$instances', // unwind instances to collect sizes
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: "$_id",
                date: {$first: "$date"},
                name: {$first: "$name"},
                product_type: {$first: "$product_type"},
                brand: {$first: "$brand"},
                base_price: {$first: "$base_price"},
                tags: {$first: "$tags"},
                colors: {$first: "$colors"},
                inventories: {
                  $push: "$instances.inventory.count"
                },
                size: {
                  $push: "$instances.size"
                },
              }
            },
            {
              $unwind: {
                path: '$inventories', // unwind inventories to collect counts of product in inventories => inventories would be array for each instance
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $unwind: {
                path: '$inventories', // unwind inventories (array for each instance) again to collect counts of product in inventories
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: "$_id",
                date: {$first: "$date"},
                name: {$first: "$name"},
                product_type: {$first: "$product_type.name"},
                brand: {$first: "$brand.name"},
                base_price: {$first: "$base_price"},
                tags: {$first: "$tags"},
                colors: {$first: "$colors"},
                size: {$first: "$size"},
                count: {
                  $sum: "$inventories"
                }
              }
            },
            {
              $unwind: {
                path: '$tags',
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'tag',
                localField: 'tags',
                foreignField: '_id',
                as: "tags"
              }
            },
            {
              $unwind: {
                path: '$tags', // unwind tags to get object instead of array in group stage
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: "$_id",
                date: {$first: "$date"},
                name: {$first: "$name"},
                product_type: {$first: "$product_type"},
                brand: {$first: "$brand"},
                base_price: {$first: "$base_price"},
                colors: {$first: "$colors"},
                size: {$first: "$size"},
                count: {$first: "$count"},
                tags: {
                  $push: "$tags"
                }
              }
            },
            {
              $unwind: {
                path: '$tags', // unwind tags to look up tag groups
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $lookup: {
                from: 'tag_group',
                localField: 'tags.tag_group_id',
                foreignField: '_id',
                as: "tag_group"
              }
            },
            {
              $unwind: {
                path: '$tag_group', // unwind tag group to get object instead of array in group stage
                preserveNullAndEmptyArrays: true
              }
            },
            {
              $group: {
                _id: "$_id",
                date: {$first: "$date"},
                name: {$first: "$name"},
                product_type: {$first: "$product_type"},
                brand: {$first: "$brand"},
                base_price: {$first: "$base_price"},
                colors: {$first: "$colors"},
                size: {$first: "$size"},
                count: {$first: "$count"},
                tags: {
                  $push: {
                    name: "$tags.name",
                    tgName: "$tag_group.name"
                  }
                },

              },
            },

          ])
        }
        else
          return Promise.resolve([])
      })
      .then(res => {
        return Promise.resolve({
          name: collectionName,
          products: res
        })

      })

  }

  setProductToCollection(cid, productId) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$push: {'productIds': productId}});
  }

  deleteProductFromCollection(cid, productId) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'productIds': productId}});
  }

  getCollectionTags(collectionId) {
    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {_id: mongoose.Types.ObjectId(collectionId)}
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
          as: "tag_group"
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
          _id: "$_id",
          tags: {
            $push: {
              name: "$tag.name",
              tg_name: "$tag_group.name"
            }
          }

        }
      }
    ])
      .then(res => {
        if (res && res.length > 0)
          return Promise.resolve(res[0]);
        else
          return Promise.reject(error.collectionNotFound);
      })

  }

  setTagToCollection(cid, tagId) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(tagId)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'tagIds': tagId}});
  }

  deleteTagFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(tid)) return Promise.reject(error.tagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'tagIds': tid}});
  }

  getCollectionTypes(collectionId) {
    if (!mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.collectionIdIsNotValid);

    return this.CollectionModel.aggregate([
      {
        $match: {_id: mongoose.Types.ObjectId(collectionId)}
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
        return Promise.reject(error.collectionNotFound);
    })

  }

  setTypeToCollection(cid, typeId) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(typeId)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'typeIds': typeId}});
  }

  deleteTypeFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId(tid)) return Promise.reject(error.typeIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'typeIds': tid}});
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
