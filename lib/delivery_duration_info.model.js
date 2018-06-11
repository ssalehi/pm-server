const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class DeliveryDurationInfo extends Base {
  constructor(test = DeliveryDurationInfo.test) {
    super('DeliveryDurationInfo', test);
    this.DeliveryDurationInfoModel = this.model;
  }
  getAllDurationInfo(){
    return this.DeliveryDurationInfoModel.find();
  }
  getOneDurationInfo(id){
    return this.DeliveryDurationInfoModel.findOne({_id: mongoose.Types.ObjectId(id)});
  }
  upsertDurationInfo(data) {
    console.log(data);
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
}

DeliveryDurationInfo.test = false;
module.exports = DeliveryDurationInfo;
