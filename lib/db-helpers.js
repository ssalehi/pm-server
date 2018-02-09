const mongo = require('../mongo');
const models = require('../mongo/models.mongo');
const helpers = require('./helpers');
const _const = require('./const.list');
const rp = (require("request-promise")).defaults({jar: true});

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


function addAgent(username , password , access_level = _const.ACCESS_LEVEL.Admin  , isTest = true) {

  let agentModel =  isTest ? models['AgentTest']: models['Agent'];

  return new agentModel({
    username,
    secret : password,
    access_level
  }).save();
}


function addAndLoginAgent(username, password = '123456' , access_level) {
    return addAgent(username, password, access_level)
      .then(res => {

        let aid = res._id;
        let rpJar = rp.jar();
        return rp({
          method: 'POST',
          uri: helpers.apiTestURL('agent/login'),
          form: {username: username, password: password},
          withCredentials: true,
          jar: rpJar,
        })
          .then(() => {
            return Promise.resolve({aid, rpJar});
          })
      })
      .catch(err => {
        return Promise.reject(`could not login '${username}' with '${password}':\n  ${helpers.parseServerErrorToString(err)}`);
      });
}

module.exports = {
  dropAll,
  addAndLoginAgent
};