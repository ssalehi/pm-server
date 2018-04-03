/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const models = require('../mongo/models.mongo');
const error = require('./errors.list');


modelName = 'Agent';


class Agent extends Person {
  constructor(test = Agent.test) {
    super('Agent', test);
    this.AgentModel = this.model;
  }

  save(data) {
    let agent = new this.AgentModel(data);
    return agent.save();
  }

  static accessCheck(accessLevel, user, isTest = false) {
    if (user)
      return (isTest ? models[modelName + 'Test'] : models[modelName]).findOne({
        username: user.username,
        access_level: accessLevel
      }, function (err, user) {
        if (err) throw err;

        if (!user)
          return Promise.reject(error.noUser);

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
}

Agent.test = false;

module.exports = Agent;