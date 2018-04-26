/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');
const models = require('../mongo/models.mongo');
const randomString = require('randomstring');
const moment = require('moment');
const mongoose = require('mongoose');
const env = require('../env');

class Customer extends Person {
  constructor(test = Customer.test) {
    super(test, 'Customer');
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

  getById(customerId) {
    return this.CustomerModel.findById(customerId);
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


  editUserBasicInfo(body, username) {
    let isPerfectData = true;
    console.log(body);
    ['username', 'name', 'surname', 'dob'].forEach(el => {
      if (!body[el])
        isPerfectData = false;
    });

    if (!isPerfectData)
      return Promise.reject(error.noCompleteRegisterData);

    body.username = body.username.toLowerCase();

    return new Promise((resolve, reject) => {
      //Check username
      this.CustomerModel.find({$and: [{username: username}, {is_verified: true}]}).lean()
        .then(res => {
          if (res.length === 0)
            return Promise.reject(error.customerIdNotValid);
          else {
            return this.CustomerModel.update({
              username: username,
            }, {
              $set: {
                national_id: body.national_id,
                first_name: body.name,
                surname: body.surname,
                username: body.username,
                dob: body.dob,
              }
            })
          }
        })
        .then((res) => {
          resolve(res);
        })
        .catch(err => reject(err));
    });
  }

  changePassword(body, username) {
    //TODO check if user is logged in (it's better)
    let isPerfectData = true;
    ['old_pass', 'new_pass', 'retype_new_pass'].forEach(el => {
      if (!body[el])
        isPerfectData = false;
    });

    if (!isPerfectData)
      return Promise.reject(error.noCompleteChanegePassData);

    if (body.new_pass !== body.retype_new_pass)
      return Promise.reject(error.retypePassNotCompatibleWithNewPass);


    return new Promise((resolve, reject) => {
      //Check username
      this.CustomerModel.find({$and: [{username: username}, {is_verified: true}]}).lean()
        .then(res => {
          console.log(res);
          if (res.length === 0)
            return Promise.reject(error.customerIdNotValid);
          else
            return Person.checkPassword(res[0].secret, body.old_pass)
              .then(() => {
                return new Promise((resolve, reject) => {
                  env.bcrypt.genSalt(10, function (err, salt) {
                    if (err)
                      reject(err);
                    else
                      resolve(salt)
                  })
                })
              })
              .then(salt => {
                return new Promise((resolve, reject) => {
                  env.bcrypt.hash(body.new_pass, salt, null, function (err, hash) {
                    if (err)
                      reject(err);
                    else
                      resolve(hash);
                  })
                })
              })
              .then(hash => {
                return this.CustomerModel.update({
                  username: username,
                }, {
                  $set: {
                    secret: hash,
                  }
                })
              })
        })
        .then((res) => {
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
      return Promise.resolve({loyalty_points: 0, balance: 0});

    return this.CustomerModel.find({
      "_id": mongoose.Types.ObjectId(user.id),
    }, 'loyalty_points balance')
      .then(res => {
        if (res && res.length > 0)
          return Promise.resolve(res[0]);
      })
  }

  setAddress(user, body) {
    if (!user.username) {
      return Promise.reject(error.noCodeUsername)
    }
    if (!body.city || !body.street || !body.province) {
      return Promise.reject(error.addressIsRequired)
    }

    if (!body.recipient_mobile_no || !body.recipient_title || !body.recipient_national_id || !body.recipient_surname ||
      !body.recipient_name) {
      return Promise.reject(error.recipientInfoIsRequired)
    }

    if (!body._id) {
      return this.CustomerModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(user.id),
        is_verified: true,
        is_guest: false
      }, {
        national_id: body.recipient_national_id,
      }).findOneAndUpdate(
        {
          $addToSet: {
            'addresses': {
              province: body.province,
              city: body.city,
              street: body.street,
              unit: body.unit,
              no: body.no,
              district: body.district,
              recipient_title: body.recipient_title,
              recipient_name: body.recipient_name,
              recipient_surname: body.recipient_surname,
              recipient_national_id: body.recipient_national_id,
              recipient_mobile_no: body.recipient_mobile_no,
              postal_code: body.postal_code,
              loc: {long: body.loc.long, lat: body.loc.lat}
            }
          }
        })
    }
    else {
      return this.CustomerModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(user.id),
        'addresses._id': mongoose.Types.ObjectId(body._id),
      }, {
        $set: {
          national_id: body.recipient_national_id,
          'addresses.$.province': body.province,
          'addresses.$.city': body.city,
          'addresses.$.street': body.street,
          'addresses.$.unit': body.unit,
          'addresses.$.no': body.no,
          'addresses.$.district': body.district,
          'addresses.$.recipient_title': body.recipient_title,
          'addresses.$.recipient_name': body.recipient_name,
          'addresses.$.recipient_surname': body.recipient_surname,
          'addresses.$.recipient_national_id': body.recipient_national_id,
          'addresses.$.recipient_mobile_no': body.recipient_mobile_no,
          'addresses.$.postal_code': body.postal_code,
          'addresses.$.loc': {long: body.loc.long, lat: body.loc.lat}
        }
      })
    }
  }

  addGuestCustomer(body) {
    if (!body.username) {
      return Promise.reject(error.noCodeUsername)
    }

    if (!body.first_name) {
      return Promise.reject(error.firstNameIsRequired)
    }

    if (!body.surname) {
      return Promise.reject(error.surNameIsRequired)
    }
    // todo: errors...

    return this.CustomerModel.findOne({
      username: body.username
    }).lean()
      .then(res => {
        if (res) {
          if (res.is_guest) {
            return this.CustomerModel.update({
              _id: res._id
            }, {
              $set: {
                first_name: body.first_name,
                surname: body.surname,
                username: body.username,
                mobile_no: body.mobile_no,
                dob: body.date,
                gender: body.gender,
                addresses: body.addresses,
                is_guest: true
              }
            })
          } else {
            return Promise.reject(error.customerExist)
          }
        } else {
          let newCustomer = new this.CustomerModel({
            username: body.username,
            first_name: body.first_name,
            surname: body.surname,
            mobile_no: body.mobile_no,
            dob: body.date,
            gender: body.gender,
            addresses: body.addresses,
            is_guest: true
          })
          return newCustomer.save();
        }
      })
  }

  getCustomerShoesType(user) {
    if (!user)
      return Promise.resolve({shoesType: "US"});
    return this.CustomerModel.find({
      "_id": mongoose.Types.ObjectId(user.id),
    }, 'shoesType').then(res => {
      if (res && res.length > 0) {
        return Promise.resolve({shoesType: res[0].shoesType});
      } else {
        return Promise.resolve({shoesType: "US"});
      }
    })

  }

  setCustomerShoesType(user, body) {
    if (!user)
      return Promise.reject(error.methodNotAllowed);
    if (!body)
      return Promise.resolve(error.bodyRequired);
    if (!body.shoesType)
      return Promise.resolve(error.bodyRequired);
    return this.CustomerModel.findOneAndUpdate({
      _id: mongoose.Types.ObjectId(user.id),
    }, {
      $set: {
        shoesType: body.shoesType
      }
    })
      .then(() => Promise.resolve());
  }

  getAddresses(user) {
    if (!user)
      return Promise.reject(error.noUser);

    return this.CustomerModel.find({
      "_id": mongoose.Types.ObjectId(user.id),
    }, 'first_name surname loyalty_points balance gender addresses balance mobile_no')
      .then(res => {
        if (res && res.length > 0)
          return Promise.resolve(res[0]);
        else
          return Promise.reject(error.noUsernameMobileNo);
      });
  }

  updateByOfflineSystem(mobileNo, point, balance) {

    return this.CustomerModel.update({
      mobile_no: mobileNo
    }, {
      $set: {
        loyalty_points: point,
        balance: balance
      }
    })

  }


  AddToWishList(user, body) {
    if (!user)
      return Promise.reject(error.noUser);
    if (!body)
      return Promise.reject(error.bodyRequired);

    let pro_id = body.product_id;
    let pro_ins_id = body.product_instance_id;

    if (!mongoose.Types.ObjectId.isValid(pro_id) || !mongoose.Types.ObjectId.isValid(pro_ins_id))
      return Promise.reject(error.invalidId);

    let newWishListItem = [];

    newWishListItem.push({
      product_id: pro_id,
      product_instance_id: pro_ins_id,
    });

    return this.CustomerModel.findOne({_id: mongoose.Types.ObjectId(user.id)})
      .then(res => {
        if (res.wish_list.length && res.wish_list.filter(el =>
            el.product_id.toString() === body.product_id.toString()
            && el.product_instance_id.toString() === body.product_instance_id.toString()).length) {
          return Promise.reject(error.duplicateWishListItem);
        }
        else {
          return this.CustomerModel.update({
            _id: mongoose.Types.ObjectId(user.id),
          }, {
            $addToSet: {
              'wish_list': {
                $each: newWishListItem
              }
            }
          }, {
            upsert: true
          })
        }
      })
  }

  getWishListItems(user) {
    if (!user)
      return Promise.reject(error.noUser);
    return this.CustomerModel.aggregate(
      [
        {
          $match: {
            $and: [
              {_id: mongoose.Types.ObjectId(user.id)},
              {is_verified: true}

            ]
          },
        },
        {
          $unwind: {
            path: '$wish_list',
            preserveNullAndEmptyArrays: false
          }
        },
        {
          $lookup: {
            from: 'product',
            localField: 'wish_list.product_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $project: {
            wish_list: 1,
            product: 1
          }
        },
      ]
    ).then(res => {
      if (res.length) {
        res.forEach(el => {
          el.product[0].instances = el.product[0].instances.filter(i => i._id.toString() === el.wish_list.product_instance_id.toString());
          el.product[0].colors = el.product[0].colors.filter(c => c._id.toString() === el.product[0].instances[0].product_color_id.toString());
        });
        return Promise.resolve(res);
      }
      else {
        return Promise.resolve('No wished item exists');
      }
    })
      .catch(error => {
        console.log(error);
      });
  }

}

Customer.test = false;
module.exports = Customer;
