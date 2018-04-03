const rp = require('request-promise');
const Base = require('./base.model');
const error = require('./errors.list');
const env = require('../env');
const jwt = require('jsonwebtoken');
const models = require('../mongo/models.mongo');
const mongoose = require('mongoose');


const JwtSecret = 'f^1l0oT';
const diffAgentCustomer = 'agent';
const PersonType = {
  Customer: 'Customer',
  Agent: 'Agent',
};
let PersonModel;

class Person extends Base {
  constructor(modelName = 'Customer', test = Person.test) {
    Person.test = test;
    super(modelName, test);
    PersonModel = this.model;
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

  static userCheck(personType, userId) {
    const curCon = models[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];
    return curCon.findOne({_id: userId, active: true}).lean();
  }

  static loginCheck(username, password, personType = PersonType.Customer, access_level) {

    let foundPerson;

    return Person.load(username, password, personType, access_level)
      .then(person => {
        foundPerson = person;
        return this.checkPassword(person.secret, password)
      })
      .then(() => {
        // TODO: enable below with socket
        // Person.setNamespace(username);
        return Promise.resolve(foundPerson);
      })
  }

  static load(username, password, personType, access_level) {
    const curCon = models[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    let searchData = {username, active: true};
    if (personType === PersonType.Customer)
      searchData = Object.assign({is_verified: true}, searchData);
    if (personType === PersonType.Agent)
      searchData = Object.assign({access_level}, searchData);

    return curCon.findOne(searchData).lean()
      .then(res => {
        if (res) {
          return Promise.resolve(res);
        }
        else
          return Promise.reject(error.noUser);
      })
  }

  static serialize(person, done) {
    done(null, {
      _id: person._id,
      personType: person.personType,
      googleAuth: person.googleAuth,
    });
  }

  static deserialize(req, person, done) {

    Person.userCheck(person.personType, person._id)
      .then((foundPerson) => {

        if (!foundPerson) {
          done(error.noUser);
        }
        if (person.googleAuth) {
          rp({
            method: 'get',
            uri: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + person.googleAuth,
          })
            .then(res => {
              done(null, foundPerson);
            })
            .catch(err => {
              done(err);
            });
        } else {
          done(null, foundPerson)
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

    Person.loginCheck(username, password, personType, req.body.loginType)
      .then(foundPerson => {
        done(null, {
          _id: foundPerson._id,
          personType
        });
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

      let curCon = models['Customer' + (Person.test ? 'Test' : '')];
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
    const curCon = models['Customer' + (Person.test ? 'Test' : '')];

    const decoded_token = jwt.verify(req.jwtToken, JwtSecret);

    return curCon.findOne({username: decoded_token.username, _id: decoded_token.id, is_verified: true})
      .then(res => {
        if (!res)
          req.user = null;
        else
          req.user = {
            id: res._id,
            username: res.username,
            googleAuth: null,
            personType: PersonType.Customer,
          };

        return Promise.resolve();
      })
  }

  static jwtAuth(body) {
    if (!body.username || !body.password)
      return Promise.reject(error.noUsernameOrPassword);

    return new Promise((resolve, reject) => {
      const person = new Person('Customer');
      person.loginCheck(body.username, body.password, PersonType.Customer)
        .then(res => {
          return Person.afterLogin({username: body.username}, false);
        })
        .then(res => {
          const payload = {
            username: res.username,
            id: res.id,
          };
          const token = jwt.sign(payload, JwtSecret);
          resolve(Object.assign({token: token}, res));
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static afterLogin(user, isAgent) {
    const curCon = models[(isAgent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    if (!user)
      return Promise.reject(error.noUser);

    // Person.setNamespace(username);
    return curCon.findOne({_id: mongoose.Types.ObjectId(user._id), active: true}).lean()
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
          };

          if (isAgent)
            obj['access_level'] = res.access_level;
          else
            obj['is_verified'] = res.is_verified;

          return Promise.resolve(obj);
        }
      })
  }

  static appOauthLogin(body) {
    console.log(body);
    return Promise.resolve();
  }
}

Person.test = false;
module.exports = Person;