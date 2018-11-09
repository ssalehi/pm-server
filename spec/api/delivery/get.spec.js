const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');
const warehouses = require('../../../warehouses');

xdescribe("it should get delivery's data", () => {
  let deliveries;
  let hub_id;
  let centerWareHouse_id;
  let customers;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models()['WarehouseTest'].insertMany(warehouses)
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
      return models()['CustomerTest'].insertMany(customers)
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
              _id: customers[0]._id,
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
              _id: customers[1]._id,
              address_id: customers[1].addresses[1]._id,
            }
          },
          to: {warehouse_id: centerWareHouse_id},
        }
      ];
      return models()['DeliveryTest'].insertMany(deliveries)
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
      uri: lib.helpers.apiTestURL(`delivery/by_id/${deliveries[1]._id}`),
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
      uri: lib.helpers.apiTestURL(`delivery/by_id/${deliveries[0]._id}`),
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

describe("Get unassigned customer related deliveries", () => {
  let deliveryAgents, customers = [], deliveries = [];

  beforeEach(done => {
    deliveryAgents = [];
    lib.dbHelpers.dropAll()
      .then(res => models()['WarehouseTest'].insertMany(warehouses))
      .then(res => lib.dbHelpers.addAndLoginAgent('da1', _const.ACCESS_LEVEL.DeliveryAgent))
      .then(res => {
        deliveryAgents.push(res)

        return lib.dbHelpers.addAndLoginAgent('da2', _const.ACCESS_LEVEL.DeliveryAgent);
      })
      .then(res => {
        deliveryAgents.push(res);

        // Add two customers
        customers = [
          {
            _id: mongoose.Types.ObjectId(),
            first_name: "AA",
            surname: "AA",
            username: "aa",
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
            first_name: "BB",
            surname: "BB",
            username: "bb",
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
        return models()['CustomerTest'].insertMany(customers);
      })
      .then(res => {
        const hubId = warehouses.find(el => el.is_hub)._id;
        const centralId = warehouses.find(el => !el.is_hub && !el.has_customer_pickup)._id;

        // Add some delivery items
        deliveries = [
          {
            _id: mongoose.Types.ObjectId(),
            order_details: {
              order_id: mongoose.Types.ObjectId(),
              order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
            },
            from: {warehouse_id: hubId},
            to: {
              customer: {
                _id: customers[0]._id,
                address_id: customers[0].addresses[0]._id,
              }
            },
            shelf_code: "AZ",
            delivery_agent: deliveryAgents[1].aid,
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: {
              order_id: mongoose.Types.ObjectId(),
              order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
            },
            from: {warehouse_id: hubId},
            to: {
              customer: {
                _id: customers[0]._id,
                address_id: customers[0].addresses[1]._id,
              }
            },
            shelf_code: "XY",
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: {
              order_id: mongoose.Types.ObjectId(),
              order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
            },
            from: {warehouse_id: hubId},
            to: {warehouse_id: centralId},
            shelf_code: "AA",
          },
          {
            _id: mongoose.Types.ObjectId(),
            order_details: {
              order_id: mongoose.Types.ObjectId(),
              order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
            },
            from: {warehouse_id: centralId},
            to: {warehouse_id: hubId},
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
                _id: customers[1]._id,
                address_id: customers[1].addresses[1]._id,
              }
            },
            to: {warehouse_id: hubId},
          }
        ];
        return models()['DeliveryTest'].insertMany(deliveries);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log('Error in beforeEach: ', err);
        done();
      });
  }, 100000);

  it("should get all unassigned deliveries (customer related)", function (done) {
    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`/delivery/unassigned`),
      body: {},
      jar: deliveryAgents[0].rpJar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);

        res = res.body;

        expect(res.length).toBe(2);
        expect(res.map(el => el._id.toString())).toContain(deliveries[1]._id.toString());
        expect(res.map(el => el._id.toString())).toContain(deliveries[4]._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});