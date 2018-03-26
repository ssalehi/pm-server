
const Base = require('./base.model');

class Dictionary extends Base {

  constructor(test = Dictionary.test) {

    super('Dictionary', test);

    this.DictionaryModel = this.model;
  }

  getDictionaries() {
    return this.DictionaryModel.find();
  }

}

Dictionary.test = false;

module.exports = Dictionary;