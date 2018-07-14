const models = require('../mongo/models.mongo');
const helpers = require('./helpers');
const _const = require('./const.list');
const rp = (require("request-promise")).defaults({jar: true});
const Agent = require('./agent.model');
const Customer = require('./customer.model');
const mongo = require('../mongo');
const mongoose = require('mongoose')


  function dropAll() {

    return new Promise((resolve, reject) => {

        if (key.includes('Test'))
          promises.push(models()[key].remove({}).exec());
      }
    )}

    return Promise.all(promises);

function addAgent(username, password, access_level, isTest = true) {

  let agent = new Agent(isTest);
  return agent.save({
    first_name: username,
    surname: username,
    username,
    secret: password,
    access_level
  });

}

function addCustomer(username, password = '123456', extraData = {}, isTest = true) {
  let customer = new Customer(isTest);

  let customerObj = Object.assign({
    username: username,
    secret: password,
  }, extraData);

  return customer.save(customerObj);
}

function addCustomer(username, password = '123456', extraData = {}, isTest = true) {
  let customer = new Customer(isTest);

  let customerObj = Object.assign({
    username: username,
    secret: password,
  }, extraData);

  return customer.save(customerObj);
}


function addAndLoginAgent(username, access_level = _const.ACCESS_LEVEL.ContentManager, warehouse_id = null, password = '123456') {
  return addAgent(username, password, access_level)
    .then(res => {
      const rpJar = rp.jar();
      const aid = res._id;
      let body = {username: username, password: password, loginType: access_level};
      if (warehouse_id)
        body['warehouse_id'] = warehouse_id;
      else if (access_level === _const.ACCESS_LEVEL.SalesManager){
        body['warehouse_id'] = aid
      }
      return rp({
        method: 'POST',
        uri: helpers.apiTestURL('agent/login'),
        body,
        json: true,
        withCredentials: true,
        jar: rpJar,
      })
        .then(() => {
          return Promise.resolve({aid, rpJar});
        })
    })
    .catch(err => {
      console.log(err);
      return Promise.reject(`could not login '${username}' with '${password}':\n  ${helpers.parseServerErrorToString(err)}`);
    });
}

function addAndLoginCustomer(username, password = '123456', extraData) {
  extraData = Object.assign({
    is_verified: _const.VERIFICATION.bothVerified,
    first_name: 'test first name',
    surname: 'test surname'
  }, extraData);
  let cid = null;
  let rpJar = null;

  return addCustomer(username, password, extraData)
    .then(res => {
      cid = res._id;
      rpJar = rp.jar();
      return rp({
        method: 'POST',
        uri: helpers.apiTestURL('login'),
        form: {username: username, password: password},
        withCredentials: true,
        jar: rpJar,
      })
    })
    .then(() => {
      return Promise.resolve({cid, rpJar});
    })
    .catch(err => {
      return Promise.reject(`could not login '${username}' with '${password}':\n  ${helpers.parseServerErrorToString(err)}`);
    });
}

module.exports = {
  dropAll,
  addAndLoginAgent,
  addAndLoginCustomer,
  addCustomer,
};