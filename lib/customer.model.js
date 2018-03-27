/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const randomString = require('randomstring');
const moment = require('moment');
const mongoose = require('mongoose');

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
    return customer.save();
  }

  generateCode() {
    return new Promise((resolve, reject) => {
      let rndStr = '';

      this.CustomerModel.find({}, {verification_code: 1})
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
      //Check username or mobile_no is exist or not
      this.CustomerModel.find({$and: [{$or: [{username: body.username}, {mobile_no: body.mobile_no}]}, {is_verified: true}]}).lean()
        .then(res => {
          if (res.length > 0)
            return Promise.reject(error.customerExist);

          return this.generateCode();
        })
        .then(code => {
          body.verification_code = code;

          return this.CustomerModel.find({
            'username': body.username,
            'mobile_no': body.mobile_no
          }).lean();
        })
        .then(res => {
          if (res.length > 0)
            return Promise.resolve({done: 'ok', message: 'register previously'});

          body.is_verified = false;

          return this.save(body);
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

    return new Promise((resolve, reject) => {
      this.CustomerModel.find({verification_code: code, 'username': username}).lean()
        .then(res => {
          if (res.length === 0)
            return Promise.reject(error.codeNotFound);

          return this.CustomerModel.update({'username': username}, {
            $set: {
              verification_code: null,
              is_verified: true
            }
          });
        })
        .then(res => resolve({done: 'ok', message: 'code is accepted'}))
        .catch(err => {
          console.error(err);
          reject(err);
        });
    });
  }

  resendVerificationCode(username) {
    return new Promise((resolve, reject) => {
      this.generateCode()
        .then(code => {
          return this.CustomerModel.update({'username': username}, {$set: {verification_code: code}});
        })
        // ToDo: Send code to customer
        .then(res => resolve(res))
        .catch(err => {
          console.error('Error when updating verification code: ', err);
          reject(err);
        });
    });
  }

  setMobileNumber(body) {
    if (!body.username || !body.mobile_no)
      return Promise.reject(error.noUsernameMobileNo);

    return new Promise((resolve, reject) => {
      this.generateCode()
        .then(res => {
          return this.CustomerModel.findOneAndUpdate({
            username: body.username,
            is_verified: false
          }, {$set: {mobile_no: body.mobile_no, verification_code: res, is_verified: false}});
        })
        .then(res => {
          console.log('====> RESTT: ', res);
          if (!res)
            return Promise.reject(error.noUser);

          resolve({done: 'ok', message: 'Send code to mobile number'});
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  getBalanceAndPoint(user) {
    if (!user)
      return Promise.reject(error.noUser);

    return this.CustomerModel.find({
      "_id": mongoose.Types.ObjectId(user.id),
    }, 'loyalty_points balance')
      .then(res => {
        if (res && res.length > 0)
          return Promise.resolve(res[0]);
      })
  }

  setAddress(username, body) {
      if (!username)
      {return Promise.reject(error.noCodeUsername)}
      if (!body.city)
      {return Promise.reject(error.addressIsRequired)}
      if (!body.street)
      {return Promise.reject(error.addressIsRequired)}

      return this.CustomerModel.update({
          is_verified: true,
          is_guest: false
      }, {
          $addToSet: {
              'addresses': {
                  city: body.city,
                  street: body.street,
                  unit: body.unit,
                  no: body.no,
                  postal_code: body.postal_code,
                  loc: {long: body.loc.long, lat: body.loc.lat}
              }
          }
      })
  }
  addGuestCustomer(body){
    if (!body.username)
    {return Promise.reject(error.noCodeUsername)}

    if (!body.first_name)
    {return Promise.reject(error.firstNameIsRequired)}

    if (!body.surname)
    {return Promise.reject(error.surNameIsRequired)}
    // todo: errors...

    return this.CustomerModel.findOne({
      username: body.username
    }).lean()
      .then(res => {
        if(res){
          if(res.is_guest){
            return this.CustomerModel.update({
                _id: res._id
              },{
              $set: {
                first_name: body.first_name,
                surname: body.surname,
                username: body.username,
                mobile_no: body.mobile_no,
                dob: body.date,
                gender: body.gender,
                is_guest: true
              }
            })
          }else{
            return Promise.reject(error.customerExist)
          }
        }else{
          let newCustomer = new this.CustomerModel({
            username: body.username,
            first_name: body.first_name,
            surname: body.surname,
            mobile_no: body.mobile_no,
            dob: body.date,
            gender: body.gender,
            is_guest: true
          })
          return newCustomer.save();
        }
      })
  }
 }

Customer.test = false;
module.exports = Customer;