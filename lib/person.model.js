const rp = require('request-promise');
const Base = require('./base.model');
const error = require('./errors.list');
const env = require('../env');
const jwt = require('jsonwebtoken');
const models = require('../mongo/models.mongo');

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

  checkPassword() {
    return new Promise((resolve, reject) => {
      if (!this.secret)
        reject(error.noPass);
      env.bcrypt.compare(this.password, this.secret, (err, res) => {
        if (err)
          reject(err);
        else if (!res)
          reject(error.badPass);
        else
          resolve();
      });
    });
  }

  loginCheck(username = this.username, password = this.password, personType = PersonType.Customer) {
    return new Promise((resolve, reject) => {
      this.load(username, password, personType)
        .then(() => this.checkPassword().then(() => {
          // TODO: enable below with socket
          // Person.setNamespace(username);
          resolve();
        }).catch(err => {
          console.error('ERR badPass: ', err);
          reject(error.badPass)
        }))
        .catch(err => {
          console.error('Err noUser: ', err);
          reject(error.noUser);
        });
    })
  }

  load(username, password, personType) {
    const curCon = models[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      this.username = username.toLowerCase();
      this.password = password;

      let searchData = {username: username};
      if(personType === PersonType.Customer)
        searchData = Object.assign({is_verified: true}, searchData);

      curCon.findOne(searchData)
        .then(res => {
          if (res) {
            this.username = res.username;
            this.secret = res.secret;
            resolve(res);
          }
          else
            reject(error.noUser);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  static serialize(person, done) {
    done(null, {
      username: person.username,
      password: person.password,
      googleAuth: person.googleAuth,
      personType: person.personType ? person.personType : null,
    });
  }

  static deserialize(req, person, done) {
    let personType = null;
    if (req.url && req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()))
      personType = PersonType.Agent;
    else
      personType = PersonType.Customer;

    let personInstance = new Person(personType, req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false);
    personInstance.username = person.username;
    personInstance.password = person.password;

    if (!person.googleAuth)
      personInstance.loginCheck(person.username, person.password, person.personType || personType)
        .then(() => {
          // ToDO: Get person whole details
          done(null, person)
        })
        .catch(err => {
          console.error(err.message);
          done(err);
        });
    else {
      if (person.googleAuth) {
        // console.log('Token is: ', person.googleAuth);
        rp({
          method: 'get',
          uri: 'https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + person.googleAuth,
        })
          .then(res => {
            done(null, person);
          })
          .catch(err => {
            done(err);
          });
      }
    }
  }

  static passportLocalStrategy(req, username, password, done) {
    let personType = null;
    if (req.url && req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()))
      personType = PersonType.Agent;
    else
      personType = PersonType.Customer;

    let person = new Person(personType, req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false);

    person.loginCheck(username, password, personType)
      .then(() => {
        done(null, {
          username: username,
          password: password,
          personType: personType,
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
      let person = new Person('Customer', req.test);

      let data = {
        username: profile.emails[0].value,
        secret: null,
        first_name: profile.name.givenName,
        surname: profile.name.familyName,
        is_verified: false,
        gender: profile.gender.value,
      };

      let curCon = models['Customer' + (Person.test ? 'Test' : '')];
      let customerModel = new curCon(data);

      let p = {
        username: data.username,
        personType: PersonType.Customer,
        googleAuth: profile.provider.toLowerCase() === 'google' ? token : null,
      };

      curCon.findOne({username: data.username})
        .then(res => {
          if (res)
            return curCon.updateOne({_id: res.id}, {$set: data});
          else
            return customerModel.save();
        })
        .then(res => done(null, p))
        .catch(err => done(err, null));
    }
  }

  static jwtStrategy(req) {
    const curCon = models['Customer' + (Person.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      const decoded_token = jwt.verify(req.jwtToken, JwtSecret);

      curCon.findOne({username: decoded_token.username, _id: decoded_token.id, is_verified: true})
        .then(res => {
          if (!res)
            req.user = null;
          else
            req.user = {
              username: res.username,
              googleAuth: null,
              personType: PersonType.Customer,
            };

          resolve();
        })
        .catch(err => {
          console.error('Error: ', err);
          reject();
        })
    });
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

    return new Promise((resolve, reject) => {
      // Person.setNamespace(username);
      curCon.findOne({username: user.username})
        .then(res => {
          if (!res)
            reject(error.noUser);
          else {
            let obj = {
              username: res.username,
              personType: isAgent ? 'agent' : 'customer',
              id: res.id,
              displayName: (res.first_name + ' ' + res.surname).trim(),
            };

            if (isAgent)
              obj['access_level'] = res.access_level;

            resolve(obj);
          }
        })
        .catch(err => {
          reject(err);
        });
    })
  }

  static appOauthLogin(body) {
    console.log(body);
    return Promise.resolve();
  }
}

Person.test = false;
module.exports = Person;