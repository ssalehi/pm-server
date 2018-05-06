const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const CollectionModel = require('./collection.model');
const ProductModel = require('./product.model');

class Campaign extends Base {

  constructor(test = Campaign.test) {

    super('Campaign', test);

    this.CampaignModel = this.model;
  }



  getCampaign(cid) {
    if (!cid || !mongoose.Types.ObjectId.isValid(cid))
      return Promise.reject(error.invalidId);

    return this.CampaignModel.findById(cid).populate({path: 'collection_ids', select: '_id name'});
  }

  setCampaign(body, campaignId) {

    if (!body.name || Number.parseInt(body.discount_ref) <= 0)
      return Promise.reject(error.InvalidCampaignInfo)


    const newInfo = {
      $set: {
        name: body.name,
        discount_ref: body.discount_ref,
      }
    };

    let start_date, end_date;
    if (body.start_date) {
      start_date = Date.parse(body.start_date);
      if (isNaN(start_date))
        start_date = null;
    }
    if (body.end_date) {
      end_date = Date.parse(body.end_date);
      if (isNaN(end_date))
        end_date = null;
    }
    if (start_date && end_date && end_date > start_date) {
      newInfo.$set.start_date = start_date;
      newInfo.$set.end_date = end_date;
    }

    if (campaignId) {

      if (body.coupon_code) {
        newInfo.$set.coupon_code = body.coupon_code;
        newInfo.$unset = {collection_ids: 1};
      }
      return this.CampaignModel.update({
        _id: campaignId
      }, newInfo)

    } else {

      return new this.CampaignModel(newInfo).save();
    }
  }

  addCollection(campaignId, collectionId) {

    if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId) ||
      !collectionId || !mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.invalidId);


    return new CollectionModel(Campaign.test).getCollectionProducts(collectionId)
      .then(res => {

        let promises = [];

        let productModel = new ProductModel(Campaign.test);
        if (!res || !res.products || !res.products.length)
          return Promise.reject(error.collectionNotFound)

        res.products.forEach(x => {
          promises.push(productModel.addCampaign(x._id, campaignId))
        })

        return Promise.all(promises);
      })
      .then(res => {
        return this.CampaignModel.update({
          _id: mongoose.Types.ObjectId(campaignId)
        }, {
            $unset: {
              'coupon_code': 1
            },
            $addToSet: {
              'collection_ids': mongoose.Types.ObjectId(collectionId)
            }
          })
      });
  }

  removeCollection(campaignId, collectionId) {

    if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId) ||
      !collectionId || !mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.invalidId);


    return new CollectionModel(Campaign.test).getCollectionProducts(collectionId)
      .then(res => {

        let promises = [];

        let productModel = new ProductModel(Campaign.test);
        res.forEach(x => {
          promises.push(productModel.removeCampaign(x._id, campaignId))
        })

        return Promise.all(promises);
      })
      .then(res => {
        return this.CampaignModel.update({
          _id: mongoose.Types.ObjectId(campaignId)
        }, {
            $unset: {
              'coupon_code': 1
            },
            $pull: {
              'collection_ids': mongoose.Types.ObjectId(collectionId)
            }
          })
      });
  }




  search(options, offset, limit) {
    let result;
    return this.CampaignModel.aggregate(
      [
        {
          $match: {name: {$regex: options.phrase, $options: 'i'}}
        },

        {
          $project: {
            'name': 1,
            'discount_ref': 1,
          }
        },
        {
          $sort: {
            'name': 1,
          }
        },
        {
          $skip: Number.parseInt(offset)
        },
        {
          $limit: Number.parseInt(limit)
        }
      ]
    ).then(res => {
      result = res;
      return this.CampaignModel.aggregate(
        [
          {
            $match: {name: {$regex: options.phrase, $options: 'i'}}
          },
          {
            $count: 'count'
          },
        ]
      ).then(res => {
        let totalCount = res[0] ? res[0].count : 0;
        return Promise.resolve({
          data: result,
          total: totalCount,
        });
      });
    });
  }



}

Campaign.test = false;

module.exports = Campaign;