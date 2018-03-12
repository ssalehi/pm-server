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

    return this.CollectionModel.findOne({_id: collectionId}).select('name name_fa')
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
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
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

          if (queryArray.length === 0)
            return Promise.resolve([]);

          let stages = [
            {
              $match: {
                $or: queryArray
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
                campaigns: {$first: "$campaigns"},
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
                campaigns: {$first: "$campaigns"},
                tags: {$first: "$tags"},
                colors: {$first: "$colors"},
                size: {$first: "$size"},
                discount: 0,
                count: {
                  $sum: "$inventories"
                }
              }
            },

          ];

          //
          if (res.campaigns && res.campaigns.length > 0)
            stages = stages.concat([
              {
                $unwind: {
                  path: '$campaigns', // unwind campaign ids to look up for campaigns and discounts
                  preserveNullAndEmptyArrays: true
                }
              },
              {
                $lookup: {
                  from: 'campaign',
                  localField: 'campaigns._id',
                  foreignField: '_id',
                  as: "campaign"
                }
              },
              {
                $match: {
                  "campaign.coupon_code": null
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
                  tags: {$first: "$tags"},
                },
              },
              {
                $project: {
                  _id: 1,
                  date: 1,
                  name: 1,
                  product_type: 1,
                  brand: 1,
                  base_price: 1,
                  colors: 1,
                  size: 1,
                  count: 1,
                  tags: 1,
                  discount: {
                    $multiply: {$subtract: [1, "$campaign.discount"]}
                  }
                },
              }]);


          return models['Product' + (Collection.test ? 'Test' : '')].aggregate(stages)
        }
        else
          return Promise.resolve([])
      })
      .then(res => {
        return Promise.resolve({
          _id: collectionId,
          name: collectionName,
          products: res
        })
      })

  }

  setProductToCollection(cid, productId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'productIds': productId}});
  }

  deleteProductFromCollection(cid, productId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(productId)) return Promise.reject(error.productIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'productIds': productId}});
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
              _id: "$tag._id",
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
          return Promise.resolve();
      })

  }

  setTagToCollection(cid, tagId) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tagId)) return Promise.reject(error.TagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'tagIds': tagId}});
  }

  deleteTagFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tid)) return Promise.reject(error.tagIdIsNotValid);

    return this.CollectionModel.update({_id: cid}, {$pull: {'tagIds': tid}});
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

    return this.CollectionModel.update({_id: cid}, {$addToSet: {'typeIds': typeId}});
  }

  deleteTypeFromCollection(cid, tid) {
    if (!mongoose.Types.ObjectId.isValid(cid)) return Promise.reject(error.collectionIdIsNotValid);
    if (!mongoose.Types.ObjectId.isValid(tid)) return Promise.reject(error.typeIdIsNotValid);

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
