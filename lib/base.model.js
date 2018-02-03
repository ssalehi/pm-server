const models = require('../mongo/models.mongo');

class Base {

  constructor(modelName, test){
      this.model = test? models[modelName+ 'Test']: models[modelName];
  }

}

module.exports = Base;