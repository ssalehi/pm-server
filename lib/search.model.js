const Base = require('./base.model');
const error = require('./errors.list');
const mongoose = require('mongoose');


class Search extends Base {

  constructor() {

    super();
  }

  searchCollection(body) {
    let modelResult;
    const models = require('../lib/');
    const limit = body.options && body.options.limit ? body.options.limit : 10;
    const offset = body.options && body.options.offset ? body.options.offset : 2;
    let target = body.options && body.options.target;
    for (let model in models) {
      if (models.hasOwnProperty(target) && model === target) {
        modelResult = models[model];
      }
    }
    let modelInstance = new modelResult();
    return modelInstance.getAllCollection().limit(limit).skip(offset);
  }

}

Search.test = false;

module.exports = Search;