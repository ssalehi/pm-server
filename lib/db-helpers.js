const mongo = require('../mongo');
const models = require('../mongo/models.mongo');

function dropAll() {

  function removeCollections() {
    let promises = [];
    for (let key in models) {

      if (models.hasOwnProperty(key)) {

        if (key.includes('Test'))
          promises.push(models[key].remove({}).exec());
      }
    }
    return Promise.all(promises);

  }

  if (mongo.testConnection.readyState === 1) {
    return removeCollections();
  }
  else
    return mongo.dbIsReady().then(() => {

      return removeCollections();
    });
}

module.exports = {
  dropAll,
};