/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const randomString = require('randomstring');
const moment = require('moment');

class Customer extends Person {
  constructor(test = Customer.test) {
    super('Customer', test);
    this.CustomerModel = this.model
  }

  load(username, password) {
    return new Promise((resolve, reject) => {
      this.username = username.toLowerCase();
      this.password = password;

      this.model.findOne({username: username})
        .then(res => {
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  save(data) {
    let customer = new this.CustomerModel(data);
    return customer.save().then(res => Promise.resolve('successful'));
  }

  generateCode() {
    return new Promise((resolve, reject) => {
      let rndStr = '';

      models['RegisterVerification' + (Customer.test ? 'Test' : '')].find({}, {code: 1})
        .then(res => {
          do {
            rndStr = randomString.generate({
              length: 6,
              charset: 'numeric',
            });
          } while (res.includes(rndStr) || rndStr[0] == '0');

          resolve(rndStr);
        })
        .catch(err => reject(err));
    });
  }

  registration(body) {
    let isPerfectData = true;

    ['username', 'password', 'first_name', 'surname', 'mobile_no', 'dob', 'gender'].forEach(el => {
      if (!body[el])
        isPerfectData = false;
    });

    if (!isPerfectData)
      return Promise.reject(error.noCompleteRegisterData);

    body.secret = body.password;
    body.username = body.username.toLowerCase();

    return new Promise((resolve, reject) => {
      this.generateCode()
        .then(code => {
          const secret = body.secret;
          delete body.secret;

          let regVerification = new models['RegisterVerification' + (Customer.test ? 'Test' : '')]({
            code: code,
            customer_data: body,
            secret: secret,
          });

          return regVerification.save();
        })
        .then(res => {
          resolve(res);
        })
        .catch(err => reject(err));
    });
  }

  verification(code) {
    if (!code)
      return Promise.reject(error.noCode);

    return new Promise((resolve, reject) => {
      models['RegisterVerification' + (Customer.test ? 'Test' : '')].findOne({code: code})
        .then(res => {
          if (!res || res.length === 0)
            return Promise.reject(error.codeNotFound);

          res.customer_data.secret = res.secret;
          res.customer_data.isMove = true;
          this.save(res.customer_data);
        })
        .catch(err => {
          console.log(err);
          reject(err);
        });
    });
  }
}

Customer.test = false;

module.exports = Customer;