/**
 * Created by Eabasir on 30/02/2018.
 */
const Person = require('./person.model');
const models = require('../mongo/models.mongo');
const error = require('./errors.list');
const _const = require('./const.list');


modelName = 'Agent';


class Agent extends Person {
  constructor(test = Agent.test) {
    super(test, 'Agent');
    this.AgentModel = this.model;
  }

  save(data) {
    let agent = new this.AgentModel(data);
    return agent.save();
  }

  getSalesManager() {
    return this.AgentModel.findOne({
      access_level: _const.ACCESS_LEVEL.SalesManager
    }).lean();
  }

  static accessCheck(accessLevels, user, isTest = false) {
    if (user)
      return (isTest ? models[modelName + 'Test'] : models[modelName]).findOne({
        username: user.username,
        access_level: {$in: accessLevels}
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

  getDeliveryAgents() {
    return this.AgentModel.find({
      access_level: _const.ACCESS_LEVEL.DeliveryAgent,
      active: true,
    }).lean()
      .then(res => {
        res.forEach(el => {
          delete el.secret;
          delete el.access_level;
        });

        return Promise.resolve(res);
      })
  }
}

Agent.test = false;

module.exports = Agent;