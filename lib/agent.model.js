/**
 * Created by Eabasir on 30/02/2018.
 */
const env = require('../env');
const error = require('./errors.list');
const AgentModel = require('../mongo/agent');

  class Agent {

  constructor(test = Agent.test) {

  }

  save() {

    let agent = new AgentModel({
      name: 'ehsan'
    });

    return agent.save().then(res => 'successful');
  }

  static adminCheck(adminOnly, user, isTest = false) {
      if (adminOnly) {
        if (user)
          return Promise.resolve((isTest ? sql.test : sql).person.isAdmin({pid: user.pid}));
        else
          return Promise.reject(error.adminOnly);
      }
      else
        return Promise.resolve();
  }

}

Agent.test = false;

module.exports = Agent;