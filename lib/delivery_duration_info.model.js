const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const CustomerModel = require('./customer.model');
const LoyaltyGroupModel = require('./loyalty_group.model');
const env = require('../env')

class DeliveryDurationInfo extends Base {
  constructor(test = DeliveryDurationInfo.test) {
    super('DeliveryDurationInfo', test);
    this.DeliveryDurationInfoModel = this.model;
  }

  getAllDurationInfo() {
    return this.DeliveryDurationInfoModel.find({
      is_collect: false,
    });
  }

  getOneDurationInfo(id) {
    return this.DeliveryDurationInfoModel.findOne({
      _id: mongoose.Types.ObjectId(id),
      is_collect: false
    });
  }

  getDurationInfoByDays(days) {
    return this.DeliveryDurationInfoModel.findOne({
      delivery_days: days,
      is_collect: false,
    }).lean();

  }

  getClickAndCollect() {
    return this.DeliveryDurationInfoModel.find({
      is_collect: true,
    });
  }

  upsertDurationInfo(data) {
    let updatedData = {};

    if (!data.is_collect && (!data.name || !data.delivery_days || !data.cities || !data.cities.length)) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    if (!data._id) {
      updatedData = {
        is_collect: false,
        name: data.name,
        delivery_days: data.delivery_days,
        cities: data.cities,
        delivery_loyalty: data.delivery_loyalty,
        add_point: null
      };
    } else {
      Object.keys(data).forEach(el => {
        if (el !== '_id')
          updatedData[el] = data[el];
      });
    }

    if (!Object.keys(updatedData).length)
      return Promise.reject(error.dataIsNotCompleted);
    return this.DeliveryDurationInfoModel.findOneAndUpdate({
      _id: mongoose.Types.ObjectId(data._id),
    }, {
        $set: updatedData
      }, {
        upsert: true,
        new: true,
      });
  }

  upsertCAndC(data) {
    let updatedData = {};
    if (data.is_collect && !data.add_point)
      return Promise.reject(error.dataIsNotCompleted);

    this.getClickAndCollect().then(res => {
      if (!data._id) {
        if (res.length)
          data._id = res[0]._id;
        updatedData = {
          is_collect: true,
          add_point: data.add_point,
        };
      } else {
        Object.keys(data).forEach(el => {
          if (el !== '_id')
            updatedData[el] = data[el];
        });
      }
      if (!Object.keys(updatedData).length)
        return Promise.reject(error.dataIsNotCompleted);
    }).then(res => {
      return this.DeliveryDurationInfoModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(data._id),
      }, {
          $set: updatedData
        }, {
          upsert: true,
          new: true,
        });
    })
  }

  deleteDuration(id) {
    if (!id)
      return Promise.reject(error.durationIdIsRequired);

    return this.DeliveryDurationInfoModel.deleteOne({_id: mongoose.Types.ObjectId(id)});
  }

  async calculateDeliveryDiscount(durationId, customerId) {

    try {

      let deliveryInfo = await this.getOneDurationInfo(durationId);
      if(!deliveryInfo)
        throw new Error('delivery duration info not found');

      let result = {
        duration: deliveryInfo.delivery_days,
        delivery_cost: deliveryInfo.cities[0].delivery_cost,
        delivery_discount: 0,
      }
      if (!customerId)
        return Promise.resolve(result);

      let foundCustomer = await new CustomerModel().getById(customerId)
      if (!foundCustomer)
        throw new Error('customer not found');

      let foundLoyaltyGroups = await new LoyaltyGroupModel().getLoyaltyGroups();
      let valid_loyaltyGroups = foundLoyaltyGroups.filter(el => el.min_score <= foundCustomer.loyalty_points);

      if (!valid_loyaltyGroups.length) {
        return Promise.resolve(result);
      }

      let scoreArray = valid_loyaltyGroups.map(el => el.min_score);
      let maxScore = Math.max(...scoreArray);
      let customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore);
      let discount = deliveryInfo.delivery_loyalty.filter(el => el._id.toString() === customer_loyaltyGroup[0]._id.toString())[0].discount;
      result.delivery_discount = Math.round(result.delivery_cost * discount / (100 * env.rounding_factor)) * env.rounding_factor;
      return Promise.resolve(result);
    
    } catch (err) {
      console.log('-> error on calculate delivey const', err);
      throw err;
    }

  }

}

DeliveryDurationInfo.test = false;
module.exports = DeliveryDurationInfo;

