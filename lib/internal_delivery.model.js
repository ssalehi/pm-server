const Base = require('./base.model');
const _const = require('./const.list');
const mongoose = require('mongoose');
const errors = require('./errors.list');
const moment = require('moment');
const models = require('../mongo/models.mongo');

class InternalDelivery extends Base {

  constructor(test = InternalDelivery.test) {
    super('InternalDelivery', test);
    this.InternalDeliveryModel = this.model;
  }


  async getInternalAgents() {
    try {
      const internal_agents = await models()['Agent' + (InternalDelivery.test ? 'Test' : '')].find({
        access_level: _const.ACCESS_LEVEL.InternalDeliveryAgent,
        active: true,
      }, {secret: 0, access_level: 0}).lean();
      return Promise.resolve(internal_agents);
    } catch (err) {
      throw err;
    }
  }

  async setInternalAgent(body) {
    try {
      const {agent_id} = body;
      if (!mongoose.Types.ObjectId.isValid(agent_id)) throw errors.invalidId;

      // is_active set to false
      await this.InternalDeliveryModel.update({is_active: true}, {is_active: false});
      // added new record for this agent
      return this.InternalDeliveryModel.create({agent_id, start_time: new Date(), is_active: true});
    } catch (err) {
      throw err;
    }
  }

}

InternalDelivery.test = false;
module.exports = InternalDelivery;