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
    return this.DeliveryDurationInfoModel.find({
      is_c_and_c: false,
    });
  }

  getOneDurationInfo(id) {
    return this.DeliveryDurationInfoModel.findOne({
      _id: mongoose.Types.ObjectId(id),
      is_c_and_c: false
    });
  }

  getClickAndCollect() {
    return this.DeliveryDurationInfoModel.find({
      is_c_and_c: true,
    });
  }

  upsertDurationInfo(data) {
    let updatedData = {};

    if (!data.is_c_and_c && (!data.name || !data.delivery_days || !data.cities || !data.cities.length)) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    if (!data._id) {
      updatedData = {
        is_c_and_c: false,
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
    if (data.is_c_and_c && !data.add_point)
      return Promise.reject(error.dataIsNotCompleted);

    this.getClickAndCollect().then(res => {
      if (!data._id) {
        if (res.length)
          data._id = res[0]._id;
        updatedData = {
          is_c_and_c: true,
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

  calculateDeliveryDiscount(data) {
    let customer_score;
    let valid_loyaltyGroups;
    let scoreArray;
    let maxScore;
    let customer_loyaltyGroup;
    let discount;
    let durationObject;
    let resObject;

    if (!data.duration_id)
      return Promise.reject(error.dataIsNotCompleted);



    return this.getOneDurationInfo(data.duration_id)
      .then(res => {
        durationObject = res;
        resObject = {
          res_delivery_cost: durationObject.cities[0].delivery_cost,
          res_delivery_discount: 0,
        }
        if (!data.customer_id)
          return Promise.resolve(resObject);

        return new CustomerModel().getById(data.customer_id)
      })
      .then(res => {
        if (res.is_guest) {
          return Promise.resolve(resObject);
        }
        customer_score = res.loyalty_points;
        return new LoyaltyGroupModel().getLoyaltyGroups();
      })
      .then(res => {
        valid_loyaltyGroups = res.filter(el => el.min_score <= customer_score);
        if (!valid_loyaltyGroups.length) {
          return Promise.resolve(resObject);
        }

        scoreArray = valid_loyaltyGroups.map(el => el.min_score);
        maxScore = Math.max(...scoreArray);
        customer_loyaltyGroup = valid_loyaltyGroups.filter(el => el.min_score === maxScore);
        discount = durationObject.delivery_loyalty.filter(el => el._id.toString() === customer_loyaltyGroup[0]._id.toString())[0].discount;
        resObject.res_delivery_discount = resObject.res_delivery_cost * discount / 100;
        return Promise.resolve(resObject);
      })
  }

  upsertFreeDeliveryOption(data) {
    if (!data.delivery_duration_id) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    // Check id to be valid when updating
    if (data.id && !mongoose.Types.ObjectId.isValid(data.id)) {
      return Promise.reject(error.invalidId);
    }

    // Check data to be complete on inserting
    if (!data.id && ['province', 'min_price'].some(el => !data[el])) {
      return Promise.reject(erro.dataIsNotCompleted);
    }

    const upsertedData = {};

    ['province', 'min_price']
      .forEach(el => {
        if (data[el])
          upsertedData[(data.id ? 'free_delivery_options.$.' : '') + el] = data[el]
      });

    const condition = {
      _id: mongoose.Types.ObjectId(data.delivery_duration_id),
    };

    if (data.id) {
      condition['free_delivery_options._id'] = data.id;
    }

    let dataObj = {};
    let newId = null;

    if (data.id) {
      dataObj = {
        $set: upsertedData
      };
    } else {
      newId = mongoose.Types.ObjectId();
      dataObj = {
        $addToSet: {
          free_delivery_options: Object.assign({
            _id: newId
          }, upsertedData)
        }
      }
    }

    return this.DeliveryDurationInfoModel.findOne({
      _id: mongoose.Types.ObjectId(data.delivery_duration_id),
      'free_delivery_options.province': data.province
    })
      .then(res => {
        if (res) {
          return Promise.reject(error.duplicatedProvince);
        }

        return this.DeliveryDurationInfoModel.findOneAndUpdate(condition, dataObj, {upsert: true, new: true})
          .then(res => Promise.resolve(data.id || newId));
      });
  }

  deleteFreeDeliveryOption(data) {
    if (!data.id || !data.delivery_duration_id) {
      return Promise.reject(error.dataIsNotCompleted);
    }

    if (!mongoose.Types.ObjectId.isValid(data.id) || !mongoose.Types.ObjectId.isValid(data.delivery_duration_id)) {
      return Promise.reject(error.invalidId);
    }

    return this.DeliveryDurationInfoModel.findOneAndUpdate({
      _id: mongoose.Types.ObjectId(data.delivery_duration_id),
    }, {
        $pull: {
          free_delivery_options: {
            _id: mongoose.Types.ObjectId(data.id)
          }
        }
      })
      .then(res => {
        console.log('res ==> ', res);
        return Promise.resolve(res);
      })
  }
}

DeliveryDurationInfo.test = false;
module.exports = DeliveryDurationInfo;

