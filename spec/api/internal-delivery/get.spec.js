const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');

describe("Get All Agents that Related to Internal Delivery", () => {
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

  it("should get all agents that have access_level internal_delivery", async function (done) {
    try {
      this.done = done;
      const res = await rp({
        method: 'GET',
        uri: lib.helpers.apiTestURL(`/internal_delivery/get_agents`),
        jar: salesManager.rpJar,
        resolveWithFullResponse: true,
        json: true
      });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(3);
      expect(res.body.filter(a => a.surname === 'surname1').length).toBe(1);
      expect(res.body.filter(a => a.surname === 'surname2').length).toBe(1);
      expect(res.body.filter(a => a.surname === 'surname3').length).toBe(1);

      done();
    } catch (err) {
      lib.helpers.errorHandler.bind(this)(err);
    }
  });
});