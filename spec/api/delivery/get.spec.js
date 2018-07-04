const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');

describe("it should get delivery's data", () => {
  let deliveries;
  let hub_id;
  let centerWareHouse_id;
  let customers;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models['WarehouseTest'].insertMany(warehouses)
    }).then((res) => {
      centerWareHouse_id = res.find(w => !w.has_customer_pickup && !w.is_hub);
      hub_id = res.find(w => w.is_hub === true)._id;
      customers = [
        {
          _id: mongoose.Types.ObjectId(),
          first_name: "ali",
          surname: "mirj",
          username: "ams",
          is_verified: true,
          addresses: [
            {
              _id: mongoose.Types.ObjectId(),
              province: "tehran",
              city: "tehran",
              street: "fatemi"
            },
            {
              _id: mongoose.Types.ObjectId(),
              city: "rasht",
              province: "rasht",
              street: "rashtAbad"
            }
          ]

        },
        {
          _id: mongoose.Types.ObjectId(),
          first_name: "ali2",
          surname: "mirj2",
          username: "ams2",
          is_verified: true,
          addresses: [
            {
              _id: mongoose.Types.ObjectId(),
              city: "tehran2",
              province: "tehran2",
              street: "fatemi2"
            },
            {
              _id: mongoose.Types.ObjectId(),
              city: "rasht2",
              province: "rasht2",
              street: "rashtAbad2"
            }
          ]
        },
      ];
      return models['CustomerTest'].insertMany(customers)
    }).then(() => {
      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {
            customer: {
              id: customers[0]._id,
              address_id: customers[0].addresses[0]._id,
            }
          },
          shelf_code: "AZ",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: centerWareHouse_id},
          shelf_code: "AA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: centerWareHouse_id},
          to: {warehouse_id: hub_id},
          shelf_code: "BA",
        },
        {
          shelf_code: "CC",
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {
            customer: {
              id: customers[1]._id,
              address_id: customers[1].addresses[1]._id,
            }
          },
          to: {warehouse_id: centerWareHouse_id},
        }
      ];
      return models['DeliveryTest'].insertMany(deliveries)
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it("should get this delivery's data from delivery that gonna send from warehouse to warehouse", function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`delivery/${deliveries[1]._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body)[0];
      expect(result.to.warehouse.name).toBe(warehouses.find(x => !x.is_hub && !x.has_customer_pickup).name);
      expect(result.from.warehouse.name).toBe(warehouses.find(x => x.is_hub).name);
      expect(result.shelf_code).toBe(deliveries[1].shelf_code);
      expect(mongoose.Types.ObjectId(result._id).toString()).toBe(deliveries[1]._id.toString());
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get this delivery's data from delivery that gonna send from warehouse to customer", function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`delivery/${deliveries[0]._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body)[0];
      expect(result.from.warehouse.name).toBe(warehouses.find(x => x.is_hub).name);
      expect(result.to.customer.first_name).toBe(customers[0].first_name);
      expect(mongoose.Types.ObjectId(result._id).toString()).toBe(deliveries[0]._id.toString());
      expect(mongoose.Types.ObjectId(result.to.customer.addresses._id).toString()).toBe(mongoose.Types.ObjectId(deliveries[0].to.customer.address_id).toString());
      expect(result.shelf_code).toBe(deliveries[0].shelf_code);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});