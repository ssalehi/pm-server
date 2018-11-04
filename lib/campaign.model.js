const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const CollectionModel = require('./collection.model');
const ProductModel = require('./product.model');
const moment = require('moment');

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

  setCampaign(body) {

    if (!body.name || Number.parseInt(body.discount_ref) <= 0 || !body.start_date || !body.end_date)
      return Promise.reject(error.InvalidCampaignInfo)


    if (!body.coupon_code && Number.parseInt(body.discount_ref) >= 100)
      return Promise.reject(error.InvalidCampaignInfo);

    const newInfo = {
      name: body.name,
      discount_ref: body.discount_ref,
    };

    let now, start_date, end_date;
    now = new Date();

    start_date = new Date(body.start_date);
    if (isNaN(start_date) || moment(moment(start_date).format('YYYY-MM-DD')).isBefore(moment(moment(now).format('YYYY-MM-DD'))))
      return Promise.reject(error.invalidDate);


    end_date = Date.parse(body.end_date);
    if (isNaN(end_date) || end_date <= now || end_date <= start_date)
      return Promise.reject(error.invalidDate);

    end_date = new Date(end_date);

    newInfo.start_date = start_date;
    newInfo.end_date = end_date;

    if (body.coupon_code) {
      newInfo.coupon_code = body.coupon_code;
    }

    return new this.CampaignModel(newInfo).save();
  }

  addRemoveCollection(campaignId, collectionId, isAdd) {
    isAdd = (isAdd === 'add');

    if (!campaignId || !mongoose.Types.ObjectId.isValid(campaignId) ||
      !collectionId || !mongoose.Types.ObjectId.isValid(collectionId))
      return Promise.reject(error.invalidId);


    return this.CampaignModel.findById(mongoose.Types.ObjectId(campaignId)).lean()
      .then(res => {

        if (res.coupon_code)
          return Promise.reject(error.couponCodeCampaign);

        if (res.end_date) {
          const now = new Date();
          if (new Date(res.end_date) < now) {
            return Promise.reject(error.campaignIsExprired)
          }

        }

        return new CollectionModel(Campaign.test).getCollectionProducts(collectionId)
      })
      .then(res => {
        if (!res || !res.products || !res.products.length)
          return Promise.reject(error.collectionNotFound)

        let promises = [];
        let productModel = new ProductModel(Campaign.test);
        res.products.forEach(x => {
          promises.push(productModel.addRemoveCampaign(x._id, campaignId, isAdd))
        })

        return Promise.all(promises);
      })
      .then(res => {

        let update = isAdd ?
          {
            $addToSet: {
              'collection_ids': mongoose.Types.ObjectId(collectionId)
            }
          } :
          {
            $pull: {
              'collection_ids': mongoose.Types.ObjectId(collectionId)
            }
          };

        return this.CampaignModel.update({
          _id: mongoose.Types.ObjectId(campaignId)
        }, update)
      });
  }

  endCampaign(cid) {
    if (!cid || !mongoose.Types.ObjectId.isValid(cid))
      return Promise.reject(error.invalidId);


    return this.CampaignModel.findById(mongoose.Types.ObjectId(cid)).lean()
      .then(res => {

        const now = new Date();
        if (new Date(res.start_date) > now) {

          const promises = [];
          res.collection_ids.forEach(x => {
            promises.push(this.addRemoveCollection(cid, x, false));
          })
          return Promise.all(promises)
            .then(res => {
              return this.CampaignModel.findById(mongoose.Types.ObjectId(cid)).remove();
            });
        } else {
          if (new Date(res.end_date) > now) {
            return this.CampaignModel.update(
              {
                _id: mongoose.Types.ObjectId(cid)
              },
              {
                $set: {end_date: now}
              });
          } else
            return Promise.reject(error.campaignIsExprired);

        }
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
            'start_date': 1,
            'end_date': 1,
            'coupon_code': 1
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