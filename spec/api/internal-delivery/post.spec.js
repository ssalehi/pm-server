const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const errors = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe("Set Agent for Internal Delivery", () => {
  let deliveries;
  let agents;
  let salesManager;
  beforeEach(async done => {
    try {
      await lib.dbHelpers.dropAll();

      // insert warehouse for sales manager
      const warehouse_sm = await models()['WarehouseTest'].create({
        name: 'انبار مرکزی',
        phone: 'نا مشخص',
        address: {
          city: 'تهران',
          street: 'نامشخص',
          province: 'تهران'
        },
        priority: 0,
      });

      const result = await lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouse_sm._id)
      salesManager = result;

      agents = await models()['AgentTest'].insertMany([{
        username: 'username1@persianmode.com',
        secret: '123',
        access_level: _const.ACCESS_LEVEL.InternalDeliveryAgent,
        first_name: 'firstname1',
        surname: 'surname1',
      }, {
        username: 'username2@persianmode.com',
        secret: '123',
        access_level: _const.ACCESS_LEVEL.InternalDeliveryAgent,
        first_name: 'firstname2',
        surname: 'surname2',
      }, {
        username: 'username3@persianmode.com',
        secret: '123',
        access_level: _const.ACCESS_LEVEL.InternalDeliveryAgent,
        first_name: 'firstname3',
        surname: 'surname3',
      }, {
        username:'username4@persianmode.com',
        secret: '123',
        access_level: _const.ACCESS_LEVEL.DeliveryAgent,
        first_name: 'firstname4',
        surname: 'surname4',
      }]);
      
      done();
    } catch (err) {
      console.log('err:', err);
      done();
    }
  }, 15000);


  xit("should get error when agent_id is not defined", async function (done) {
    try {
      this.done = done;
      const res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`/internal_delivery/set_agent`),
        body: {
          // agent_id: agents[0]._id
        },
        jar: salesManager.rpJar,
        resolveWithFullResponse: true,
        json: true
      });
      this.fail('should get error when agent_id is not defined');
      done();
    } catch (err) {
      expect(err.statusCode).toBe(errors.invalidId.status);
      expect(err.error).toBe(errors.invalidId.message);
      done();
    }
  });

  xit("should be set agent internal delivery", async function (done) {
    try {
      this.done = done;
      const res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`/internal_delivery/set_agent`),
        body: {
          agent_id: agents[0]._id
        },
        jar: salesManager.rpJar,
        resolveWithFullResponse: true,
        json: true
      });
      
      expect(res.statusCode).toBe(200);

      const agent = await models()['InternalDeliveryTest'].find().lean();
      expect(agent.length).toBe(1);
      expect(agent[0].is_active).toBe(true);
      expect(agent[0].agent_id.toString()).toBe(agents[0]._id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });

  it("should be update agent for internal delivery", async function (done) {
    try {
      // create agent that now is_active for internal
      await models()['InternalDeliveryTest'].insertMany([{
        agent_id: agents[1].id,
        is_active: false,
        start_time: new Date()
      }, {
        agent_id: agents[2].id,
        is_active: true,
        start_time: new Date()
      }]);

      this.done = done;
      const res = await rp({
        method: 'POST',
        uri: lib.helpers.apiTestURL(`/internal_delivery/set_agent`),
        body: {
          agent_id: agents[0]._id
        },
        jar: salesManager.rpJar,
        resolveWithFullResponse: true,
        json: true
      });
      
      expect(res.statusCode).toBe(200);

      const agent = await models()['InternalDeliveryTest'].find({is_active: true}).lean();
      expect(agent.length).toBe(1);
      expect(agent[0].is_active).toBe(true);
      expect(agent[0].agent_id.toString()).toBe(agents[0]._id.toString());

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });
});