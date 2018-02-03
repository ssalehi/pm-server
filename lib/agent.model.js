/**
 * Created by Eabasir on 30/02/2018.
 */
const Base = require('./base.model');
const models = require('../mongo/models.mongo');
const error = require('./errors.list');

class Agent extends Base{


  constructor(test = Agent.test) {
    super('Agent', test);
    this.AgentModel = this.model;
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