const rp = require('request-promise');
const Base = require('./base.model');
const error = require('./errors.list');
const env = require('../env');
const models = require('../mongo/models.mongo');

const diffAgentCustomer = 'agent';
const PersonType = {
  Customer: 'Customer',
  Agent: 'Agent',
};
const agentProperties = [
  'username',
  'secret',
  'access_level'
];
const customerProperties = [
  'username',
  'secret',
  'first_name',
  'surname',
  'email',
  'mobile',
  'dob',
  'loyalty_points',
  'preferred_brands',
  'wish_list',
  'preferred_tags',
  'orders',
  'addresses'
];
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

  importData(data) {
    (this.personType === PersonType.Agent ?
      agentProperties
      :
      customerProperties).forEach(key => {
      if (data[key] !== undefined)
        this[key] = data[key];
    });
  }

  load(username, password, personType) {
    const curCon = models[(personType === PersonType.Agent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      this.username = username.toLowerCase();
      this.password = password;

      curCon.findOne({username: username})
        .then(res => {
          if(res) {
            this.importData(res);
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
      .then(() => done(null, {
        username: username,
        password: password,
        personType: personType,
      }))
      .catch(err => done(err, false));
  }

  static passportOAuthStrategy(req, token, refreshToken, profile, done) {
    if(req.url.toLowerCase().includes(diffAgentCustomer.toLowerCase()))
      done(error.noAccess);
    else{
      let person = new Person('Customer', req.test);

      if (profile.provider.toLowerCase() == 'google')
        person.googleAuth = token;

      let data = {
        username: profile.emails[0].value,
        password: null,
        first_name: profile.name.givenName,
        surname: profile.name.familyName,
      };

      let curCon = models['Customer' + (Person.test ? 'Test' : '')];

      let p = {
        username: data.username,
        password: null,
        personType: PersonType.Customer,
      };

      curCon.findOne({username: data.username})
        .then(res => {
          if(res)
            return curCon.update({username: username}, data);
          else
            return curCon.insert(data);
        })
        .then(res => done(null, p))
        .catch(err => done(err, null));
    }
  }

  static afterLogin(user, isAgent) {
    const curCon = models[(isAgent ? 'Agent' : 'Customer') + (Person.test ? 'Test' : '')];

    return new Promise((resolve, reject) => {
      // Person.setNamespace(username);
      curCon.findOne({username: user.username})
        .then(res => {
          if(!res)
            reject(error.noUser);
          else {
            let obj = {
              username: res.username,
              personType: isAgent ? 'agent' : 'customer',
              id: res.id,
              displayName: (res.first_name + ' ' + res.surname).trim(),
            };

            if(isAgent)
              obj['access_level'] = res.access_level;

            resolve(obj);
          }
        })
        .catch(err => {
          reject(err);
        });
    })
  }
}

Person.test = false;
module.exports = Person;