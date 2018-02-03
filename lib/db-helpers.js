const mongo = require('../mongo');
const models = require('../mongo/models.mongo');

function dropAll() {

    return mongo.dbIsReady().then(() => {

      let promises = [];
      for (let key in models) {

        if (models.hasOwnProperty(key)) {

          if(key.includes('Test'))
            promises.push(models[key].remove({}).exec());
        }
      }
      return Promise.all(promises);

  });
}

module.exports = {
  dropAll,
};