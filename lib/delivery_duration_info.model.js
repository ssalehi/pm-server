const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class DeliveryDurationInfo extends Base {
  constructor(test = DeliveryDurationInfo.test) {
    super('DeliveryDurationInfo', test);
    this.DeliveryDurationInfoModel = this.model;
  }
  getDurationInfo(){
    return this.DeliveryDurationInfoModel.find();
  }
  upsertDurationInfo(data) {
    console.log(data);
    let updatedData = {};
    if (!data._id) {
      console.log('insert is being done now');
      if (!data.name || !data.duration_value || !data.cities || !data.cities.length) {
        return Promise.reject(error.dataIsNotCompleted);
      }
      updatedData = {
        name: data.name,
        duration_value: data.duration_value,
        duration_cities: data.cities,
      };
    } else {
      console.log('updat will done later');
      // Object.keys(data).forEach(el => {
      //   if (el !== '_id')
      //     updatedData[el] = data[el];
      // });
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
}

DeliveryDurationInfo.test = false;
module.exports = DeliveryDurationInfo;
