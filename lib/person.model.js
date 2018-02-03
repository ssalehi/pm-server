const rp = require('request-promise');
const Base = require('./base.model');
const error = require('./errors.list');
const env = require('../env');

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

  loginCheck(username = this.username, password = this.password) {
    return new Promise((resolve, reject) => {
      this.load(username, password)
        .then(() => this.checkPassword().then(() => {
          // TODO: enable below with socket
          // Person.setNamespace(username);
          resolve();
        }).catch(err => reject(error.badPass)))
        .catch(err => reject(error.noUser));
    })
  }

  static serialize(person, done) {
    done(null, {
      username: person.username,
      password: person.password,
    });
  }

  static deserialize(req, person, done) {
    let personInstance = new Person(req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false);
    personInstance.username = person.username;
    personInstance.password = person.password;

    if (!person.googleAuth)
      personInstance.loginCheck()
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
    let person = new Person((req.url && req.url.includes('admin')) ? PersonType.Agent : PersonType.Customer, req.app.get('env') === 'development' ? req.query.test === 'tEsT' : false);
    person.loginCheck(username, password)
      .then(() => done(null, person))
      .catch(err => done(err, false));
  }

  static passportOAuthStrategy(req, token, refreshToken, profile, done) {
    // let person = new Person('Customer', req.test);
    //
    // if (profile.provider.toLowerCase() == 'google') {
    //   person.googleAuth = token;
    //   person.facebookAuth = null;
    //   person.linkedinAuth = null;
    // }
    //
    // let displayName = {fa: null, en: null};
    // if (profile.displayName) {
    //   displayName.en = Person.detectLanguage(profile.displayName) === 'en' ? profile.displayName : null;
    //   displayName.fa = Person.detectLanguage(profile.displayName) === 'fa' ? profile.displayName : null;
    // }
    // else {
    //   displayName.en = Person.detectLanguage(profile.name.givenName) === 'en' ? profile.name.givenName + ' ' + profile.name.familyName : null;
    //   displayName.fa = Person.detectLanguage(profile.name.givenName) === 'fa' ? profile.name.givenName + ' ' + profile.name.familyName : null;
    // }
    //
    // let data = {
    //   username: profile.emails[0].value,
    //   password: null,
    //   firstname_en: Person.detectLanguage(profile.name.givenName) === 'en' ? profile.name.givenName : null,
    //   firstname_fa: Person.detectLanguage(profile.name.givenName) === 'fa' ? profile.name.givenName : null,
    //   surname_en: Person.detectLanguage(profile.name.familyName) === 'en' ? profile.name.familyName : null,
    //   surname_fa: Person.detectLanguage(profile.name.familyName) === 'fa' ? profile.name.familyName : null,
    //   display_name_en: displayName.en,
    //   display_name_fa: displayName.fa,
    //   is_user: true
    // };
    //
    // let curSql = Person.test ? sql.test : sql;
    //
    // curSql[tableName].get({username: data.username})
    //   .then(res => {
    //     if (res && res.length > 0)
    //       person.update(res[0].pid, data)
    //         .then(res => done(null, person))
    //         .catch(err => done(err, null));
    //     else
    //       person.insert(data)
    //         .then(res => done(null, person))
    //         .catch(err => done(err, null));
    //   })
    //   .catch(err => {
    //     console.log(err);
    //     done(err, null);
    //   });
  }
}

Person.test = false;
module.exports = Person;