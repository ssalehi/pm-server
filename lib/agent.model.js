/**
 * Created by Eabasir on 30/02/2018.
 */
const env = require('../env');
const error = require('./errors.list');
const _Agent = require('../mongo/agent');

let AgentModel;

class Agent {


  constructor(test = Agent.test) {

    AgentModel = test ? _Agent.AgentModel : _Agent.AgentModelTest
  }

  save() {

    let agent = new AgentModel({
      username: 'eabasir',
      secret: '123456',
      access_level: 0
    });

    return agent.save().then(res => Promise.resolve('successful'));
  }

  static adminCheck(adminOnly, user, isTest = false) {
    if (adminOnly) {
      if (user)
        return (isTest ? _Agent.AgentModelTest : _Agent.AgentModel).findOne({username: user.username}, function (err, user) {
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