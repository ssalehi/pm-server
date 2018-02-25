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
    let genCode = null;

    const regVerModel = models['RegisterVerification' + (Customer.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      this.generateCode()
        .then(code => {
          genCode = code;

          return regVerModel.find({'customer_data.username': body.username, 'customer_data.mobile_no': body.mobile_no}).lean();
        })
        .then(res => {
          if(res.length === 0)
            return Promise.resolve({done: 'ok', message: 'register previously'});

          const secret = body.secret;
          delete body.secret;

          let regVerification = new regVerModel({
            code: genCode,
            customer_data: body,
            secret: secret,
          });

          return regVerification.save();
        })
        // ToDo: send verification code to customer
        .then(res => {
          resolve(res);
        })
        .catch(err => reject(err));
    });
  }

  verification(code, username) {
    if (!code || !username)
      return Promise.reject(error.noCodeUsername);

    let saveResult = null;
    const regVerModel = models['RegisterVerification' + (Customer.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      regVerModel.find({code: code, 'customer_data.username': username}).lean()
        .then(res => {
          if (res.length === 0)
            return Promise.reject(error.codeNotFound);

          res = res[0];

          res.customer_data.secret = res.secret;
          delete res.customer_data._id;
          this.save(res.customer_data);
        })
        .then(res => {
          saveResult = res;
          return regVerModel.deleteMany({'customer_data.username': username});
        })
        .then(res => resolve(saveResult))
        .catch(err => {
          console.error(err);
          reject(err);
        });
    });
  }
}

Customer.test = false;

module.exports = Customer;