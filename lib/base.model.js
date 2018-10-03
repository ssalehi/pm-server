const models = require('../mongo/models.mongo');
const mongo = require('../mongo');

class Base {
  constructor(modelName, test) {
    this.model = test ? models()[modelName + 'Test'] : models()[modelName];
    this.connection = test ? mongo.testConnection : mongo.prodConnection;
    this.collectionName = test ? modelName + 'Test' : modelName ;

  }
}

module.exports = Base;