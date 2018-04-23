
const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');

class Dictionary extends Base {

  constructor(test = Dictionary.test) {

    super('Dictionary', test);

    this.DictionaryModel = this.model;
  }

  getDictionaries() {
    return this.DictionaryModel.find();
  }

  updateDictionary(DictionaryId, body) {
    let params = {};
    for (const key in body) {
      let acceptKeys = ["name", "value", "type"];
      if (body.hasOwnProperty(key) && acceptKeys.includes(key)) {
        params[key] = body[key];
      }
    }
    if (!mongoose.Types.ObjectId.isValid(DictionaryId)) {
      return Promise.reject(error.invalidDictionary);
    }
    return this.DictionaryModel.findByIdAndUpdate(DictionaryId, params);
  }

  removeDictionary(DictionaryId) {
    if (!mongoose.Types.ObjectId.isValid(DictionaryId)) {
      return Promise.reject(error.invalidDictionary);
    }
    return this.DictionaryModel.findByIdAndRemove(DictionaryId);
  }

  addDictionary(body) {
    let params = {};
    for (const key in body) {
      let acceptKeys = ["name", "value", "type"];
      if (body.hasOwnProperty(key) && acceptKeys.includes(key)) {
        params[key] = body[key];
      }
    }
    return new Promise((resolve, reject) => {
      this.DictionaryModel.create(params).then(() => {
        resolve();
      }).catch(err => {
        reject(error.duplicateDictionary);
      });
    })
  }

}

Dictionary.test = false;

module.exports = Dictionary;