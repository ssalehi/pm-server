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

const JwtSecret = 'f^1l0oT';
const diffAgentCustomer = 'agent';
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

    let searchData = {username, active: true};
    if (personType === PersonType.Customer)
      searchData = Object.assign({is_verified: true}, searchData);
    if (personType === PersonType.Agent)
      searchData = Object.assign({access_level}, searchData);

    return this.PersonModel.findOne(searchData).lean()
      .then(res => {
        if (res) {
          return Promise.resolve(res);
        }
        else
          return Promise.reject(error.noUser);
      })
  }

  afterLogin(user, isAgent) {
    if (!user)
      return Promise.resolve({});

    // don't use this.ProductModel here. because current instance of person is made be api response without modelName.
    // so, default model name is always used ('Customer')
    const curCon = models[(isAgent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    // Person.setNamespace(username);
    return curCon.findOne({_id: mongoose.Types.ObjectId(user.id.toString()), active: true}).lean()
      .then(res => {
        if (!res)
          return Promise.reject(error.noUser);
        else {
          if (res.hasOwnProperty('is_verified') && !res.is_verified)
            return Promise.reject(error.notVerified);
          let obj = {
            username: res.username,
            personType: isAgent ? 'agent' : 'customer',
            id: res._id,
            displayName: (res.first_name + ' ' + res.surname).trim(),
            name: res.first_name.trim(),
            surname: res.surname.trim(),
            mobile_no: res.mobile_no,
            national_id: res.national_id,
            dob: res.dob,
            gender: res.gender,
          };

          if (isAgent) {
            obj['access_level'] = res.access_level;
            if (user.hasOwnProperty('warehouse_id')) {
              obj['warehouse_id'] = user.warehouse_id;
              socket.setGroup(user.warehouse_id);
              return Promise.resolve(obj);

              // helpers.generateToken(user.warehouse_id).then(token => {
              //   obj['socket_token'] = token;
              //   // socket.setGroup(token);
              //   return Promise.resolve(obj);
              // });
            }
          }
          else
            obj['is_verified'] = res.is_verified;

          return Promise.resolve(obj);
        }
      })
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
        if(person && !foundPerson) {
          req.logout()
            .then(() => done(error.noUser));
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
                done(err);
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

  static passportLocalStrategy(req, username, password, done) {
    let personType = req.url && req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()) ?
      PersonType.Agent :
      PersonType.Customer;

    let person = new Person(Person.isTest(req), personType);
    person.loginCheck(username, password, personType, req.body.loginType)
      .then(foundPerson => {
        const obj = {
          id: foundPerson._id,
          personType
        };

        if (req.body.loginType) {
          if (req.body.loginType.toString() === _const.ACCESS_LEVEL.ShopClerk.toString() ||
            req.body.loginType.toString() === _const.ACCESS_LEVEL.SalesManager.toString()) {

            if (!req.body.hasOwnProperty('warehouse_id')) {
              let error = new Error('agent warehouse is not defined');
              done(error, false);
              // todo: test must be written
            }

            const warehouse = new Warehouse(Person.isTest(req));
            warehouse.getAllWarehouses().then(warehouses => {

              if (!warehouses.some(x => x._id.toString() === req.body.warehouse_id)) {
                let error = new Error('in valid warehouse id');
                done(error, false);
                // todo: test must be written
              }
              if (req.body.loginType.toString() === _const.ACCESS_LEVEL.SalesManager.toString() &&
                req.body.warehouse_id !== warehouses.find(x => x.is_center)._id.toString()) {

                let error = new Error('no access to this warehouse');
                done(error, false);
                // todo: test must be written
              }
              if (req.body.loginType.toString() === _const.ACCESS_LEVEL.ShopClerk.toString() &&
                req.body.warehouse_id === warehouses.find(x => x.is_center)._id.toString()) {

                let error = new Error('no access to this warehouse');
                done(error, false);
                // todo: test must be written
              }


              obj['warehouse_id'] = req.body.warehouse_id;
              done(null, obj)
            });
          }
        }
        else
          done(null, obj);
      })
      .catch(err => {
        done(err, false);
      });
  }


  static passportOAuthStrategy(req, token, refreshToken, profile, done) {
    if (req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()))
      done(error.noAccess);
    else {
      let data = {
        username: profile.emails[0].value,
        secret: null,
        first_name: profile.name.givenName,
        surname: profile.name.familyName,
        is_verified: false,
      };

      if (profile.gender) {
        data['gender'] = profile.gender.value === 'male' ? 'm' : 'f';
      }

      let curCon = models['Customer' + (Person.isTest(req) ? 'Test' : '')];
      let customerModel = new curCon(data);

      let p = {
        username: data.username,
        personType: PersonType.Customer,
        googleAuth: profile.provider.toLowerCase() === 'google' ? token : null,
      };

      curCon.findOne({username: data.username})
        .then(res => {
          if (res) {
            delete data.is_verified;
            return curCon.updateOne({_id: res.id}, {$set: data});
          } else
            return customerModel.save();
        })
        .then(res => {
          p = Object.assign({id: res._id}, p);
          done(null, p);
        })
        .catch(err => done(err, null));
    }
  }

  static jwtStrategy(req) {
    const curCon = models['Customer' + (Person.isTest(req) ? 'Test' : '')];

    const decoded_token = jwt.verify(req.jwtToken, JwtSecret);

    return curCon.findOne({username: decoded_token.username, _id: decoded_token.id, is_verified: true})
      .then(res => {
        if (!res)
          req.user = null;
        else
          req.user = {
            id: res._id,
            googleAuth: null,
            personType: PersonType.Customer,
            username: res.username,
          };

        return Promise.resolve();
      })
  }

  static jwtAuth(body) {
    if (!body.username || !body.password)
      return Promise.reject(error.noUsernameOrPassword);

    const person = new Person(Person.test, 'Customer');
    return person.loginCheck(body.username, body.password, PersonType.Customer)
      .then(res => {
        return person.afterLogin({id: res._id}, false);
      })
      .then(res => {
        const payload = {
          username: res.username,
          id: res.id,
        };
        const token = jwt.sign(payload, JwtSecret);
        return Promise.resolve(Object.assign({token: token}, res));
      })
  }

  static checkPassword(secret, password) {
    return new Promise((resolve, reject) => {
      if (!secret)
        reject(error.noPass);
      env.bcrypt.compare(password, secret, (err, res) => {
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
    const curCon = models[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.isTest(req) ? 'Test' : '')];
    return curCon.findOne({_id: userId, active: true}).lean();
  }

  static appOauthLogin(body) {
    console.log(body);
    return Promise.resolve();
  }

  static isTest(req) {

    if (!req.app) // socket io is also using passport and req is not exists there
      return false;

    return req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false;
  }


}

Person.test = false;
module.exports = Person;