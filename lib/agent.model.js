/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const models = require('../mongo/models.mongo');
const error = require('./errors.list');

const agentProperties = ['username', 'secret', 'job'];
class Agent extends Person{
  constructor(test = Agent.test) {
    super('Agent', test);
    this.AgentModel = this.model;
  }

  importData(data) {
    agentProperties.forEach(key => {
      if(data[key] !== undefined)
        this[key] = data[key];
    });
  }

  load(username, password) {
    return new Promise((resolve, reject) => {
      this.username = username.toLowerCase();
      this.password = password;

      this.model.findOne({username: username})
        .then(res => {
          console.log('RES: ', res);
          this.importData(res);
          resolve(res);
        })
        .catch(err => {
          reject(err);
        });
    });
  }

  save() {

    let agent = new this.AgentModel({
      username: 'eabasir',
      secret: '123456',
      access_level: 0
    });

    return agent.save().then(res => Promise.resolve('successful'));
  }

  static adminCheck(adminOnly, user, isTest = false) {
    if (adminOnly) {
      if (user)
        return (isTest ? models[modelName + 'Test'] : models[modelName]).findOne({username: user.username}, function (err, user) {
          if (err) throw err;
          return user.comparePassword(user.password, function (err, isMatch) {
            if (err || !isMatch)
              return Promise.resolve(error.badPass);
            else
              return Promise.resolve();
          });
        });
      else
        return Promise.reject(error.adminOnly);
    }
    else
      return Promise.resolve();
  }
}

Agent.test = false;

module.exports = Agent;