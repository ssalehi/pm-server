/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const error = require('./errors.list');
const helpers = require('./helpers');
const _const = require('./const.list');
const randomString = require('randomstring');
const mongoose = require('mongoose');
const env = require('../env');
const token = require('../lib/updateToken.model');
const rp = require('request-promise');

class Customer extends Person {
  constructor(test = Customer.test) {
    super(test, 'Customer');
    this.CustomerModel = this.model;

    this.verificationItems = {
      mobile: 'mobile',
      email: 'email'
    };
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

  async generateCode() {
    let tokenStr;

    if (!(tokenStr = token.getToken()).IsSuccessful) {
      await token.initTokenRequest();
      tokenStr = token.getToken();
    }

    if (tokenStr.IsSuccessful) {
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
            resolve({code: rndStr, tokenStr: tokenStr.TokenKey});
          })
          .catch(err => {
            console.error('Error when generating verification code: ', err);
            reject(err);
          });
      });
    } else {
      console.error('Server can not send token');
      return Promise.reject(error.tokenFailed);
    }
  }


  getById(customerId) {
    return this.CustomerModel.findById(customerId);
  }

  registration(body) {
    let isPerfectData = true;
    let smsInfo = {};
    ['username', 'password', 'first_name', 'surname', 'mobile_no', 'dob', 'gender'].forEach(el => {
      if (!body[el])
        isPerfectData = false;
    });

    if (!isPerfectData)
      return Promise.reject(error.noCompleteRegisterData);

    body.secret = body.password;
    body.username = body.username.toLowerCase();

    return new Promise((resolve, reject) => {
      //Check username or mobile_no exists or not
      // ToDo: if user was on editing register page, this should accept the new data :-?
      this.CustomerModel.find(
        // {$and: [
        {$or: [{username: body.username}, {mobile_no: body.mobile_no}]},
        // {is_verified: _const.VERIFICATION.bothVerified}
        // ]}
      ).lean()
        .then(res => {
          if (res.length > 0)
            return Promise.reject(error.customerExist);

          return this.generateCode();
        })
        .then((res) => {
          smsInfo = {
            code: res.code,
            mobile_number: body.mobile_no,
            token_str: res.tokenStr,
          };
          body.verification_code = res.code;

          return this.CustomerModel.find({
            'username': body.username,
            'mobile_no': body.mobile_no
          }).lean();
        })
        .then(res => {
          if (res.length > 0)
            return Promise.resolve({done: 'ok', message: 'register previously'});
          body.is_verified = _const.VERIFICATION.notVerified;
          return this.save(body);
        })
        .then(res => {
          this.sendVerificationSms(smsInfo);
          return Promise.resolve(res);
        })
        .then(res => {
          // activities like this one should not be sync
          this.sendActivationMail(body.username, false);
          resolve(res);
        })
        .catch(err => reject(err));
    });
  }

  async sendVerificationSms(smsInfo) {

    try {
      let res = await rp({
        method: 'POST',
        body: {
          Code: smsInfo.code,
          MobileNumber: smsInfo.mobile_number,
        },
        uri: env.send_sms_url,
        headers: {
          'Content-Type': 'application/json',
          'x-sms-ir-secure-token': smsInfo.token_str,
        },
        json: true,
        resolveWithFullResponse: true,
      });
      return Promise.resolve(res);
    } catch (err) {
      console.log('-> error on send verificaiton code', err);
    }

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
      this.CustomerModel.find({$and: [{username: username}, {is_verified: _const.VERIFICATION.bothVerified}]}).lean()
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

  setNewPassword(body) {
    if (!body.mobile_no)
      return Promise.reject(error.noMobileNo);

    if (!body.code)
      return Promise.reject(error.noCode);

    if (!body.password)
      return Promise.reject(error.noPass);

    return (new Promise((resolve, reject) => {
      env.bcrypt.genSalt(10, function (err, salt) {
        if (err)
          reject(err);
        else
          resolve(salt)
      })
    }))
      .then(salt => {
        return new Promise((resolve, reject) => {
          env.bcrypt.hash(body.password, salt, null, function (err, hash) {
            if (err)
              reject(err);
            else
              resolve(hash);
          });
        });
      })
      .then(hash => {
        return this.CustomerModel.findOneAndUpdate({
          verification_code: body.code,
          mobile_no: body.mobile_no,
          is_verified: _const.VERIFICATION.bothVerified,
        }, {
            $set: {
              verification_code: null,
              secret: hash
            }
          });
      })
      .then(res => {
        if (!res)
          return Promise.reject(error.noUser);
        return Promise.resolve(res);
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
      return Promise.reject(error.noCompleteChangesPassData);

    if (body.new_pass !== body.retype_new_pass)
      return Promise.reject(error.retypePassNotCompatibleWithNewPass);


    return new Promise((resolve, reject) => {
      //Check username
      this.CustomerModel.find({
        $and: [
          {username: username},
          {is_verified: _const.VERIFICATION.bothVerified}
        ]
      }).lean()
        .then(res => {
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

  verification(user, code, username) {
    if (!user && !username)
      return Promise.reject(error.noUser);

    const theUsername = username ? username : user.username;

    if (!code)
      return Promise.reject(error.noCodeUsername);

    return new Promise((resolve, reject) => {
      this.CustomerModel.find({verification_code: code, username: theUsername}).lean()
        .then(res => {
          if (res.length === 0)
            return Promise.reject(error.codeNotFound);

          return this.CustomerModel.findOneAndUpdate({username: theUsername}, {
            $set: {
              verification_code: null,
              is_verified: this.getNewVerificationLevel(res[0].is_verified, this.verificationItems.mobile)
            }
          }, {returnNewDocument: true});
        })
        .then(res => resolve({done: 'ok', message: 'code is accepted', is_verified: res.is_verified}))
        .catch(err => {
          console.error(err);
          reject(err);
        });
    });
  }

  async resendVerificationCode(user, username) {
    try {
      if (!username && user)
        username = user.username;

      let smsInfo = {};
      let res = await this.generateCode();
      smsInfo = {
        code: res.code,
        token_str: res.tokenStr,
        mobile_number: '',
      };
      res = await this.CustomerModel.findOneAndUpdate({'username': username}, {$set: {verification_code: res.code}});
      smsInfo.mobile_number = res.mobile_no;
      this.sendVerificationSms(smsInfo);

      return Promise.resolve();

    } catch (err) {
      console.log('-> erro on resend verification code', err);
      throw err;
    }

  }

  forgotPassword(body) {
    let smsInfo = {};
    if (!body.mobile_no)
      return Promise.reject(error.noMobileNo);

    return this.generateCode()
      .then(res => {
        smsInfo = {
          code: res.code,
          token_str: res.tokenStr,
          mobile_number: '',
        };
        return this.CustomerModel.findOneAndUpdate({
          mobile_no: body.mobile_no,
          is_verified: _const.VERIFICATION.bothVerified,
        }, {
            $set: {
              'verification_code': res.code,
            }
          });
      })
      .then(res => {
        if (!res)
          return Promise.reject(error.noUser);
        smsInfo.mobile_number = res.mobile_no;
        this.sendVerificationSms(smsInfo);
        return Promise.resolve({done: 'ok'});
      })
      .catch(err => {
        console.error('Error when resend verification code : ', err);
        return Promise.reject(err);
      })
  }


  setMobileNumber(user, mobile_no) {
    let smsInfo = {};
    if (!user)
      return Promise.reject(error.noUser);

    if (!mobile_no)
      return Promise.reject(error.noUsernameMobileNo);

    return new Promise((resolve, reject) => {
      this.generateCode()
        .then(res => {
          smsInfo = {
            code: res.code,
            token_str: res.tokenStr,
            mobile_number: '',
          };

          return this.CustomerModel.find({
            username: {$ne: user.username},
            mobile_no
          });
        }).then(res => {
          // mobile is not set on this user (comes from google oauth),
          //         so no previous user with this mobile should exist
          if (res.length >= 1)
            return Promise.reject(error.customerExist);

          return this.CustomerModel.findOneAndUpdate({
            username: user.username
          }, {
              $set: {
                mobile_no: mobile_no,
                verification_code: smsInfo.code,
              }
            });
        })
        .then(res => {
          if (!res)
            return Promise.reject(error.noUser);

          smsInfo.mobile_number = res.mobile_no;
          this.sendVerificationSms(smsInfo);
          resolve({done: 'ok', message: 'code sent to mobile number'})
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  generateActivationLink() {
    return new Promise((resolve, reject) => {
      let rndStr = '';

      this.CustomerModel.find({}, {activation_link: 1})
        .then(res => {
          do {
            rndStr = randomString.generate({
              length: 80,
              charset: 'alphanumeric'
            });
          } while (res && res.includes(rndStr));

          resolve(rndStr);
        })
        .catch(err => reject(err));
    });
  }

  async sendActivationMail(email, isForgotMail) {

    try {

      let activation_link = await this.generateActivationLink();
      let updatedCustomer = await this.CustomerModel.findOneAndUpdate({
        username: email
      }, {
          activation_link
        }, {
          new: true
        });

      if (!updatedCustomer)
        throw error.noUser;

      let mailContent = this.composeActivationMail(res.first_name, res.surname, activation_link, isForgotMail);
      return helpers.sendMail(mailContent.plainContent, mailContent.htmlContent, mailContent.subject, email);

    } catch (err) {
      console.log('-> error on send verification email', err);
      throw err;
    }


  }

  composeActivationMail(firstName, surName, activation_link, isForgotMail = false) {
    let link = env.appAddress + '/login/oauth/' + activation_link;
    let name = this.getCompleteName(firstName, surName);
    let res = {
      subject: '',
      plainContent: '',
      htmlContent: '',
    };

    if (isForgotMail) {
      res.subject = 'تغییر رمز عبور اکانت کاربری Bank of Style';
      res.plainContent = name + 'گرامی' + '\n' +
        'متوجه شدیم که شما درخواست تغییر رمز عبور داده‌اید.\n' +
        'لطفا برای ادامه مسیر از لینک زیر استفاده کنید:' +
        '\n' + link + '\n' +
        'اگر شما این درخواست را نداده‌اید، می‌توانید این ایمیل را نادیده بگیرید.' + '\n' +
        '\n\n' + 'با آرزوی بهترین ها، ' + '\n' + 'Bank of Style';
      res.htmlContent = `<p>${name} گرامی</p>
                        <p>متوجه شدیم که شما درخواست تغییر رمز عبور داده‌اید.</p>
                        <p>لطفا برای ادامه مسیر از لینک زیر استفاده کنید:</p><br>
                        <a href="${link}">لینک تغییر رمز عبور</a><br><br>
                        <p>اگر شما این درخواست را نداده‌اید، می‌توانید این ایمیل را نادیده بگیرید.</p><br>
                        <div style="font-size: 13px">
                            <p>با آرزوی بهترین ها،</p>
                            <p>Bank of Style</p>
                        </div>`;
    } else {
      res.subject = 'Bank of Style ایمیل فعال سازی';
      res.plainContent = name + 'گرامی' + '\n' +
        'از ثبت نام شما کمال تشکر را داریم.\n' +
        'برای تکمیل ثبت نام خود، از لینک زیر جهت فعال‌سازی ایمیل خود استفاده کنید:\n' +
        link + '\n' +
        'اگر شما ثبت نام نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.' + '\n' +
        '\n\n' + 'با آرزوی بهترین ها, ' + '\n' + 'Bank of Style';
      res.htmlContent = `<p>${name} گرامی</p>
                        <p>از ثبت نام شما کمال تشکر را داریم.</p>
                        <p>برای تکمیل ثبت نام خود، از لینک زیر جهت فعال‌سازی ایمیل خود استفاده کنید:</p><br>
                        <a href="${link}">لینک فعال سازی</a><br><br>
                        <p>اگر شما ثبت نام نکرده‌اید، می‌توانید این ایمیل را نادیده بگیرید.</p><br>
                        <div style="font-size: 13px;">
                            <p>با آرزوی بهترین ها،</p>
                            <p>Bank of Style</p>
                        </div>`;
    }

    return res;
  }

  getCompleteName(firstName, surName) {
    if (firstName && surName)
      return firstName + ' ' + surName;
    if (firstName && !surName)
      return firstName;
    if (!firstName && surName)
      return surName;
    return 'user';
  }

  checkActiveLink(activation_link) {
    return new Promise((resolve, reject) => {
      return this.CustomerModel.find({activation_link})
        .then(res => {
          if (res.length > 1) {
            return Promise.reject(error.duplicateLink);
          }
          else if (res.length === 1) {
            return this.CustomerModel.findOneAndUpdate({
              activation_link
            }, {
                activation_link: null,
                is_verified: this.getNewVerificationLevel(res[0].is_verified, this.verificationItems.email)
              }, {
                returnNewDocument: true
              });
          }
          else {
            reject(error.expiredLink);
          }
        })
        .then(res => resolve({done: 'ok', is_verified: res.is_verified}))
        .catch(err => reject(err));
    });
  }

  /**
   *
   * @param oldLevel
   *  the level that we come from
   * @param newFeature
   *  the added feature, i.e. 'mobile' or 'email'
   * @param isReversed
   *  if e.g. we want to change mobile, we need to find the previous verified
   *  level to set its is_verified to
   * @returns {number} as for newLevel
   */
  getNewVerificationLevel(oldLevel, newFeature, isReversed = false) {
    if (newFeature === this.verificationItems.mobile) {
      if (oldLevel === _const.VERIFICATION.notVerified || oldLevel === _const.VERIFICATION.mobileVerified)
        return (isReversed ? _const.VERIFICATION.notVerified : _const.VERIFICATION.mobileVerified);
      else if (oldLevel === _const.VERIFICATION.emailVerified || oldLevel === _const.VERIFICATION.bothVerified)
        return (isReversed ? _const.VERIFICATION.emailVerified : _const.VERIFICATION.bothVerified);
    }
    else if (newFeature === this.verificationItems.email) {
      if (oldLevel === _const.VERIFICATION.notVerified || oldLevel === _const.VERIFICATION.emailVerified)
        return (isReversed ? _const.VERIFICATION.notVerified : _const.VERIFICATION.emailVerified);
      else if (oldLevel === _const.VERIFICATION.mobileVerified || oldLevel === _const.VERIFICATION.bothVerified)
        return (isReversed ? _const.VERIFICATION.mobileVerified : _const.VERIFICATION.bothVerified);
    }

    // fallback
    return oldLevel;
  }

  getBalanceAndPoint(user) {
    if (!user || user.access_level !== undefined)
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
        is_verified: _const.VERIFICATION.bothVerified,
        is_guest: false
      }, {
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
        }, {
          new: true,
        });
    }
    else {
      return this.CustomerModel.findOneAndUpdate({
        _id: mongoose.Types.ObjectId(user.id),
        'addresses._id': mongoose.Types.ObjectId(body._id),
      }, {
          $set: {
            // national_id: body.recipient_national_id,
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
    let ret;
    return this.CustomerModel.findOne({
      username: body.username,
      is_guest: true,
    }).lean()
      .then(res => {
        if (res) {
          ret = res;
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
            .then(() => Promise.resolve(ret));
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
          });
          return newCustomer.save();
        }
      })
  }

  setCustomerShoesType(user, body) {
    if (!user || user.access_level !== undefined)
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
    if (!user || user.access_level !== undefined)
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

  updateByOfflineSystem(id, point) {

    return this.CustomerModel.update({
      _id: mongoose.Types.ObjectId(id)
    }, {
        $set: {
          loyalty_points: point
        }
      })

  }

  AddToWishList(user, body) {
    if (!user || user.access_level !== undefined)
      return Promise.reject(error.noUser);
    if (!body)
      return Promise.reject(error.bodyRequired);

    let pro_id = body.product_id;
    let pro_ins_id = body.product_instance_id;

    if (!mongoose.Types.ObjectId.isValid(pro_id) || !mongoose.Types.ObjectId.isValid(body.product_color_id)) {
      return Promise.reject(error.invalidId);
    }

    let newWishListItem = [];

    newWishListItem.push({
      product_id: pro_id,
      product_instance_id: pro_ins_id ? pro_ins_id : null,
      product_color_id: body.product_color_id,
    });

    return this.CustomerModel.findOne({_id: mongoose.Types.ObjectId(user.id)})
      .then(res => {
        const currentProducts = res.wish_list.filter(el => el.product_id.toString() === pro_id.toString());
        if (currentProducts.length) {
          if (pro_ins_id && currentProducts.some(el => el.product_instance_id && el.product_instance_id.toString() === pro_ins_id.toString())) {
            return Promise.reject(error.duplicateWishListItem);
          }
          else if (!pro_ins_id && !currentProducts.filter(el => el.product_color_id.toString() === body.product_color_id.toString()).length) {
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
              });
          }
          else if (!pro_ins_id && currentProducts.filter(el => el.product_color_id.toString() === body.product_color_id.toString()).length) {
            return Promise.reject(error.duplicateWishListItem);
          }
          else if (pro_ins_id && currentProducts.filter(el => el.product_color_id.toString() === body.product_color_id.toString()).length) {
            const curInst = currentProducts.find(el => el.product_color_id.toString() === body.product_color_id.toString());
            curInst.product_instance_id = pro_ins_id;
            curInst.product_color_id = body.product_color_id;
            return this.CustomerModel.update({
              _id: mongoose.Types.ObjectId(user.id),
            }, {
                $set: {
                  wish_list: res.wish_list,
                }
              }, {
                upsert: true
              });
          }
          else if (pro_ins_id &&
            (currentProducts.filter(el => !el.product_instance_id && el.product_color_id.toString() === body.product_color_id.toString()).length
              || !currentProducts.filter(el => el.product_color_id.toString() === body.product_color_id.toString()).length)) {
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
              });
          }
        }
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
          });
      });
  }

  getWishListItems(user) {
    if (!user || user.access_level !== undefined) {
      return Promise.reject(error.noUser);
    }
    return this.CustomerModel.aggregate(
      [
        {
          $match: {
            $and: [
              {_id: mongoose.Types.ObjectId(user.id)},
              {is_verified: _const.VERIFICATION.bothVerified}

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
          el.product[0].instances = el.wish_list.product_instance_id ? el.product[0].instances.filter(i => i._id.toString() === el.wish_list.product_instance_id.toString()) : null;
          el.product[0].colors = el.product[0].colors.filter(c => c._id.toString() === el.wish_list.product_color_id.toString());
        });
        return Promise.resolve(res);
      }
      else {
        return Promise.resolve([]);
      }
    })
      .catch(error => {
        console.log(error);
      });
  }

  removeFromWishList(user, wishItemId) {
    if (!user || user.access_level !== undefined)
      return Promise.reject(error.noUser);
    if (!wishItemId)
      return Promise.reject(erro.wishItemIdIsRequired);

    return this.CustomerModel.update({
      '_id': mongoose.Types.ObjectId(user.id),
    },
      {
        $pull: {
          'wish_list': {
            '_id': mongoose.Types.ObjectId(wishItemId)
          }
        }
      })
  }

  setPreferences(user, body) {
    if (!user)
      return Promise.reject(error.noUser);

    let username = user.username;
    const updatedObj = {};

    if (body.preferred_size)
      updatedObj.preferred_size = body.preferred_size;
    if (body.preferred_brands)
      updatedObj.preferred_brands = body.preferred_brands;
    if (body.preferred_tags)
      updatedObj.preferred_tags = body.preferred_tags;
    updatedObj['is_preferences_set'] = true;

    return this.CustomerModel.update({username}, {
      $set: updatedObj
    });
  }

  getPreferences(username) {
    return this.CustomerModel.aggregate([
      {
        $match: {username}
      },
      {
        $project: {
          _id: 1,
          preferred_brands: 1,
          preferred_size: 1,
          preferred_tags: 1,
          is_preferences_set: 1,
        }
      },
      {
        $unwind: {
          path: '$preferred_brands',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'brand',
          localField: 'preferred_brands',
          foreignField: '_id',
          as: 'brands',
        }
      },
      {
        $unwind: {
          path: '$brands',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $unwind: {
          path: '$preferred_tags',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'tag',
          localField: 'preferred_tags',
          foreignField: '_id',
          as: 'tags',
        }
      },
      {
        $unwind: {
          path: '$tags',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'tag_group',
          localField: 'tags',
          foreignField: '_id',
          as: 'tag_groups',
        }
      },
      {
        $unwind: {
          path: '$tag_groups',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$_id',
          preferred_brands: {$addToSet: '$brands'},
          preferred_tags: {
            $addToSet: {
              _id: '$tags._id',
              name: '$tags.name',
              tag_group_name: '$tag_groups.name',
              tag_group_id: '$tag_groups._id'
            }
          },
          preferred_size: {$first: '$preferred_size'},
          is_preferences_set: {$first: '$is_preferences_set'},
        }
      }
    ])
      .then(res => {
        return res ? Promise.resolve(res[0]) : null
      });
  }

  updateBalance(id, balance) {
    return this.CustomerModel.update({
      _id: mongoose.Types.ObjectId(id)
    }, {
        $set: {
          balance: balance
        }
      })

  }
}

Customer.test = false;
module.exports = Customer;
