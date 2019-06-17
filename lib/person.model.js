const rp = require('request-promise');
const Base = require('./base.model');
const error = require('./errors.list');
const env = require('../env');
const jwt = require('jsonwebtoken');
const models = require('../mongo/models.mongo');
const mongoose = require('mongoose');
const _const = require('../lib/const.list');
const socket = require('../socket');
const Warehouse = require('./warehouse.model');
const bcrypt = require('bcrypt-nodejs');

const JwtSecret = 'f^1l0oT';
const diffAgentCustomer = 'agent';
const setMobileRoute = '/register/mobile';
const PersonType = {
  Customer: 'Customer',
  Agent: 'Agent',
};

class Person extends Base {
  constructor(test = Person.test, modelName = 'Customer') {
    Person.test = test;
    super(modelName, test);
    this.PersonModel = this.model;
  }

  loginCheck(username, password, personType = PersonType.Customer, access_level) {
    let foundPerson;
    return this.load(username, password, personType, access_level)
      .then(person => {
        foundPerson = person;
        return Person.checkPassword(person.secret, password)
      })
      .then(() => {
        return Promise.resolve(foundPerson);
      })
  }

  load(username, password, personType, access_level) {
    let searchData = {active: true};

    if (personType === PersonType.Customer)
      searchData = Object.assign({
        $or: [{username: new RegExp(username, 'i')}, {mobile_no: username}],
      }, searchData);

    if (personType === PersonType.Agent)
      searchData = Object.assign({username: new RegExp("^" + username.toLowerCase(), 'i'), access_level}, searchData);
    return this.PersonModel.findOne(searchData).lean()
      .then(res => {
        if (res) {
          return Promise.resolve(res);
        }
        else
          return Promise.reject(error.noUser);
      })
  }

  async afterLogin(user, isAgent) {
    if (!user)
      return {};

    // don't use this.PersonModel here. because current instance of person is made by API response without modelName.
    // so, default model name is always used ('Customer')
    const curCon = models()[(isAgent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    const foundPerson = await curCon.findOne({
      _id: mongoose.Types.ObjectId(user.id.toString()),
      active: true
    }).lean();

    if (!foundPerson)
      throw error.noUser;

    // don't send user info! instead, send proper error for the client to know how to react
    if (foundPerson.hasOwnProperty('email_verified') && !foundPerson.email_verified)
      throw error.notEmailVerified

    if (foundPerson.hasOwnProperty('mobile_verified') && !foundPerson.mobile_verified)
      throw error.notMobileVerified

    let obj = {
      username: foundPerson.username,
      personType: isAgent ? 'agent' : 'customer',
      id: foundPerson._id,
      shoesType: foundPerson.shoesType,
      displayName: (foundPerson.first_name + ' ' + foundPerson.surname).trim(),
      name: foundPerson.first_name.trim(),
      surname: foundPerson.surname.trim(),
      mobile_no: foundPerson.mobile_no,
      national_id: foundPerson.national_id,
      dob: foundPerson.dob,
      gender: foundPerson.gender,
      is_preferences_set: foundPerson.is_preferences_set,
      preferred_tags: foundPerson.preferred_tags,
    };

    if (isAgent) {
      obj['access_level'] = foundPerson.access_level;
      if (user.hasOwnProperty('warehouse_id')) {
        obj['warehouse_id'] = user.warehouse_id;
        return obj;
      }
    }else{
      obj.mobile_verified = foundPerson.mobile_verified;
      obj.email_verified = foundPerson.email_verified;
    }
    return obj;
  }

  static serialize(person, done) {

    const obj = {
      id: person.id,
      personType: person.personType,
      googleAuth: person.googleAuth,
    };

    if (person.hasOwnProperty('warehouse_id'))
      obj['warehouse_id'] = person.warehouse_id;

    done(null, obj);
  }

  static deserialize(req, person, done) {

    Person.userCheck(req, person.personType, person.id)
      .then((foundPerson) => {
        if (person && !foundPerson) {
          req.logout();
          req.session.destroy(function (err) {
            if (err) {
              done(err.noUser);
            }

          });
        }
        if (!foundPerson) {
          done(error.noUser);
        } else {
          if (person.hasOwnProperty('warehouse_id')) {
            // todo: test this
            foundPerson['warehouse_id'] = person.warehouse_id;
          }
          if (person.googleAuth) {
            rp({
              method: 'get',
              uri: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + person.googleAuth,
            })
              .then(res => {
                done(null, Object.assign(foundPerson, {id: foundPerson._id}));
              })
              .catch(err => {
                req.logout();
                req.session.destroy(function (err) {
                  if (err) {
                    done(err);
                  }

                });
              });
          } else {
            done(null, Object.assign(foundPerson, {id: foundPerson._id}))
          }
        }
      })
      .catch(err => {
        console.error(err.message);
        done(err);
      });
  }

  static async passportLocalStrategy(req, username, password, done) {
    try {

      let personType = req.url && req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()) ?
        PersonType.Agent :
        PersonType.Customer;

      let person = new Person(Person.isTest(req), personType);
      const foundPerson = await person.loginCheck(username, password, personType, req.body.loginType)
      const obj = {
        id: foundPerson._id,
        personType
      };


      // don't login if not verified
      if (personType === PersonType.Customer && !foundPerson.email_verified) {
        throw error.notEmailVerified;
      }
      if (personType === PersonType.Customer && !foundPerson.mobile_verified) {
        throw error.notMobileVerified;
      }

      let loginType = Number.parseInt(req.body.loginType, 10);
      if (loginType && (loginType === _const.ACCESS_LEVEL.ShopClerk || loginType === _const.ACCESS_LEVEL.HubClerk)) {

        if (!req.body.hasOwnProperty('warehouse_id')) {
          throw new Error('agent warehouse is not defined');
        } else {
          const warehouse = new Warehouse(Person.isTest(req));
          const warehouses = await warehouse.getAll();

          if (!warehouses.some(x => x._id.toString() === req.body.warehouse_id)) {
            throw new Error('in valid warehouse id');
          }
          if (loginType === _const.ACCESS_LEVEL.HubClerk &&
            req.body.warehouse_id !== warehouses.find(x => x.is_hub)._id.toString()) {
            throw new Error('no access to this warehouse');
          }
          if (loginType === _const.ACCESS_LEVEL.ShopClerk &&
            req.body.warehouse_id === warehouses.find(x => x.is_hub)._id.toString()) {

            throw new Error('no access to this warehouse');
          }

          obj['warehouse_id'] = req.body.warehouse_id;
          done(null, obj);
        }
      }
      else if (loginType && loginType === _const.ACCESS_LEVEL.SalesManager) {
        obj['warehouse_id'] = obj.id;
        done(null, obj);
      }
      else
        done(null, obj);
    } catch (err) {
      done(err, null);
    }
  }

  static async passportOAuthStrategy(req, token, refreshToken, profile, done) {
    try {

      if (req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase())) {
        done(error.noAccess);
        return;
      }

      let data = {
        username: profile.emails[0].value,
        secret: null,
        first_name: profile.name.givenName,
        surname: profile.name.familyName,
        email_verified: true
      };

      if (profile.gender) {
        data['gender'] = profile.gender.value === 'male' ? 'm' : 'f';
      }

      let curCon = models()['Customer' + (Person.isTest(req) ? 'Test' : '')];
      let customerModel = new curCon(data);

      let p = {
        username: data.username,
        personType: PersonType.Customer,
        googleAuth: profile.provider.toLowerCase() === 'google' ? token : null,
      };

      const preCustomer = await curCon.findOne({username: data.username}).lean()
      let updatedCustomer;
      if (preCustomer) {
        delete data.secret;
        updatedCustomer = await curCon.findOneAndUpdate({_id: preCustomer._id}, {$set: data}, {new: true});
      } else {
        updatedCustomer = await customerModel.save();
      }

      p = Object.assign({id: updatedCustomer._id}, p);
      done(null, p);

    } catch (err) {
      done(err, null)
    }

  }

  static async jwtStrategy(req, isAgent = false) {

    // search apis are not checked for user access before loading of search model
    // so isAgent flag is null in case of search action 
    if (!isAgent)
      isAgent = req.url.includes('search');

    const curCon = models()[(isAgent ? 'Agent' : 'Customer') + (Person.isTest(req) ? 'Test' : '')];

    const decoded_token = jwt.verify(req.jwtToken, JwtSecret);

    let condition = {
      username: decoded_token.username,
      _id: decoded_token.id
    };

    if (isAgent)
      Object.assign(condition, {active: true});

    const foundPerson = curCon.findOne(condition)
    if (!foundPerson)
      req.user = null;
    else {
      if (!isAgent) {
        if ((foundPerson.mobile_verified && foundPerson.email_verified) ||
          // app google login condition -> should allow only for the setting mobile route!
          (foundPerson.email_verified && req.url.toLowerCase().includes(setMobileRoute))) {
          req.user = {
            id: res._id,
            googleAuth: null,
            personType: PersonType.Customer,
            username: res.username,
          };
        }
      } else {
        req.user = res;
      }
    }
  }

  static jwtAuth(body, isAgent = false) {
    if (!body.username || !body.password)
      return Promise.reject(error.noUsernameOrPassword);

    const person = isAgent ? new Person(Person.test, 'Agent') : new Person(Person.test, 'Customer');
    return person.loginCheck(body.username, body.password, isAgent ? PersonType.Agent : PersonType.Customer, isAgent ?
      body.loginType
      : null)
      .then(res => {
        return person.afterLogin({id: res._id}, isAgent);
      })
      .then(res => {
        const payload = {
          username: res.username,
          id: res.id,
        };
        const token = jwt.sign(payload, JwtSecret);
        return Promise.resolve(Object.assign({token: token}, res));
      });
  }

  static checkPassword(secret, password) {
    return new Promise((resolve, reject) => {
      if (!secret)
        reject(error.noPass);
      bcrypt.compare(password, secret, (err, res) => {
        if (err)
          reject(err);
        else if (!res)
          reject(error.badPass);
        else
          resolve();
      });
    });
  }

  static userCheck(req, personType, userId) {
    const curCon = models()[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.isTest(req) ? 'Test' : '')];
    return curCon.findOne({_id: userId, active: true}).lean();
  }

  static async appOauthLogin(body) {
    let data = {
      username: body.email,
      secret: null,
      first_name: body.givenName,
      surname: body.familyName,
      email_verified: true,
    };

    if (body.gender) {
      data['gender'] = body.gender === 'male' ? 'm' : 'f';
    }

    let curCon = models()['Customer' + (Person.test ? 'Test' : '')];
    let customerModel = new curCon(data);

    const preCustomer = await curCon.findOne({username: data.username})
    let updatedCustomer;
    if (preCustomer) {
      delete data.secret;
      updatedCustomer = await curCon.findOneAndUpdate({
        _id: res._id
      }, {
          $set: data,
        }, {
          new: true,
        });
    } else {
      updatedCustomer = await customerModel.save();
    }
    const payload = {
      username: res.username,
      id: updatedCustomer._id,
    };

    const token = jwt.sign(payload, JwtSecret);
    return Object.assign({token: token}, updatedCustomer._doc);
  }

  static isTest(req) {
    if (!req.app) // socket io is also using passport and req does not exist there
      return false;

    return req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false;
  }
}

Person.test = false;
module.exports = Person;
