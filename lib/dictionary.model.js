
const Base = require('./base.model');
const error = require('./errors.list');

class Dictionary extends Base {

  constructor(test = Dictionary.test) {

    super('Dictionary', test);

    this.DictionaryModel = this.model;
  }

  getDictionaries() {
    return this.DictionaryModel.find();
  }

  removeDictionary(DictionaryId) {
    console.log('DictionaryId', DictionaryId);
  }

  addDictionary(body) {
    console.log('---------addDictionary------------');
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