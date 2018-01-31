const models = require('../mongo/models.mongo');

class Base {

  constructor(modelName, test){
      this.model = test? models[modelName]: models[modelName+ 'Test'];
  }

}

module.exports = Base;