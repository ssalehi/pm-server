
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
    if (!mongoose.Types.ObjectId.isValid(DictionaryId)) {
      return Promise.reject(error.invalidDictionary);
    }
    return this.DictionaryModel.findByIdAndUpdate(DictionaryId, body);
  }

  removeDictionary(DictionaryId) {
    if (!mongoose.Types.ObjectId.isValid(DictionaryId)) {
      return Promise.reject(error.invalidDictionary);
    }
    return this.DictionaryModel.findByIdAndRemove(DictionaryId);
  }

  addDictionary(body) {
    return new Promise((resolve, reject) => {
      this.DictionaryModel.create(body).then(() =>{
        resolve(); 
      }).catch(err => {
        reject(error.duplicateDictionary);
      });
    })
  }

}

Dictionary.test = false;

module.exports = Dictionary;