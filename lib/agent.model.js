/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const models = require('../mongo/models.mongo');
const error = require('./errors.list');


modelName = 'Agent';
class Agent extends Person{
  constructor(test = Agent.test) {
    super('Agent', test);
    this.AgentModel = this.model;
  }

  save(data) {
    let agent = new this.AgentModel(data);
    return agent.save();
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