const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class LoyaltyGroup extends Base {
  constructor(test = LoyaltyGroup.test) {
    super('LoyaltyGroup', test);
    this.LoyaltyGroupModel = this.model;
  }

  getLoyaltyGroups() {
    return this.LoyaltyGroupModel.find();
  }

  upsertLoyaltyGroup(data) {
    let updatedData = {};

    if (!data._id) {
      if (!data.name || !data.min_score)
        return Promise.reject(error.dataIsNotCompleted);

      updatedData = {
        name: data.name,
        min_score: data.min_score,
      };
    } else {
      Object.keys(data).forEach(el => {
        if (el !== '_id')
          updatedData[el] = data[el];
      });
    }

    if (!Object.keys(updatedData).length)
      return Promise.reject(error.dataIsNotCompleted);

    return this.LoyaltyGroupModel.findOneAndUpdate({
      _id: mongoose.Types.ObjectId(data._id),
    }, {
      $set: updatedData
    }, {
      upsert: true,
      new: true,
    });
  }

  deleteLoyaltyGroup(id) {
    if (!id)
      return Promise.reject(error.loyaltyGroupIdIsRequired);

    return this.LoyaltyGroupModel.deleteOne({_id: mongoose.Types.ObjectId(id)});
  }
}

LoyaltyGroup.test = false;
module.exports = LoyaltyGroup;