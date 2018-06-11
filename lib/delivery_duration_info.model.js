const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');
const CustomerModel = require('./customer.model');
const LoyaltyGroupModel = require('./loyalty_group.model');

class DeliveryDurationInfo extends Base {
  constructor(test = DeliveryDurationInfo.test) {
    super('DeliveryDurationInfo', test);
    this.DeliveryDurationInfoModel = this.model;
  }

  getAllDurationInfo() {
    return this.DeliveryDurationInfoModel.find();
  }

  getOneDurationInfo(id) {
    return this.DeliveryDurationInfoModel.findOne({_id: mongoose.Types.ObjectId(id)});
  }

  upsertDurationInfo(data) {
    let updatedData = {};
    if (!data._id) {
      if (!data.name || !data.delivery_days || !data.cities || !data.cities.length) {
        return Promise.reject(error.dataIsNotCompleted);
      }
      updatedData = {
        name: data.name,
        delivery_days: data.delivery_days,
        cities: data.cities,
        delivery_loyalty: data.delivery_loyalty
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

  deleteDuration(id) {
    if (!id)
      return Promise.reject(error.durationIdIsRequired);

    return this.DeliveryDurationInfoModel.deleteOne({_id: mongoose.Types.ObjectId(id)});
  }

  calculateFinalPrice(data) {
    let customer_score;
    let valid_loyaltyGroups;
    let scoreArray;
    let maxScore;
    let customer_loyaltyGroup;
    let final_delivery_cost;
    let discount;
    let delivery_cost;
    let durationObject;
    if (!data.customer_id || !data.delivery_id)
      return Promise.reject(error.dataIsNotCompleted);


    return this.getOneDurationInfo(data.delivery_id)
      .then (res => {
        delivery_cost = res.cities[0].delivery_cost;
        durationObject = res;
        return new CustomerModel().getById(data.customer_id)
      })
      .then(res => {
        customer_score = res.loyalty_points;
        return new LoyaltyGroupModel().getLoyaltyGroups();
      })
      .then(res => {
        valid_loyaltyGroups = res.filter(el => el.min_score <= customer_score);
        if(!valid_loyaltyGroups.length) return Promise.resolve(durationObject.cities[0].delivery_cost);

        scoreArray = valid_loyaltyGroups.map(el => el.min_score);
        maxScore = Math.max(...scoreArray);
        customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore);
        discount = durationObject.delivery_loyalty.filter(el => el._id.toString() === customer_loyaltyGroup[0]._id.toString())[0].discount;
        final_delivery_cost = delivery_cost - (delivery_cost* discount /100);
        return Promise.resolve(final_delivery_cost);
      })
  }
}

DeliveryDurationInfo.test = false;
module.exports = DeliveryDurationInfo;


// return Promise.resolve(customer_loyaltyGroup);
// let customer_score;
// let valid_loyaltyGroups;
// let scoreArray;
// let maxScore;
// let customer_loyaltyGroup;
// let final_delivery_cost;
// let discount;
// let delivery_cost;
// if (!data.customer_id || !data.delivery_id)
//   return Promise.reject(error.dataIsNotCompleted);
//
// return new CustomerModel().getById(data.customer_id)
//   .then(res => {
//     customer_score = res.loyalty_points;
//     return new LoyaltyGroupModel().getLoyaltyGroups();
//   })
//   .then(res => {
//     valid_loyaltyGroups = res.filter(el => el.min_score <= customer_score);
//     if(!valid_loyaltyGroups.length) return Promise.reject('No Discount');
//
//     scoreArray = valid_loyaltyGroups.map(el => el.min_score);
//     maxScore = Math.max(...scoreArray);
//     customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore);
//     return this.getOneDurationInfo(data.delivery_id);
//   })
//   .then(res => {
//     console.log(customer_loyaltyGroup);
//     console.log(res);
//     delivery_cost = res.cities[0].delivery_cost;
//     discount = res.delivery_loyalty.filter(el => el._id.toString() === customer_loyaltyGroup[0]._id.toString())[0].discount;
//     final_delivery_cost = delivery_cost - (delivery_cost* discount /100);
//     return Promise.resolve(final_delivery_cost);
//   })