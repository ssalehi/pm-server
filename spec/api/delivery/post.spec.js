const lib = require('../../../lib');
const _const = require('../../../lib/const.list');
const errors = require('../../../lib/errors.list');
const warehouses = require('../../../warehouses');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe("Delivery POST API", () => {
  let salesManager, shopClerk1, shopClerk2;
  let agentList = [{
    _id: mongoose.Types.ObjectId(),
    username: 'isc',
    secret: 'abc123',
    access_level: 2,
    first_name: 'IranMall',
    surname: 'sc',
    active: true,
  }, {
    _id: mongoose.Types.ObjectId(),
    username: 'hub',
    secret: 'abc123',
    access_level: 3,
    first_name: 'Mr Hub',
    surname: 'Clerk',
    active: true,
  }, {
    _id: mongoose.Types.ObjectId(),
    username: 'deli1',
    secret: 'abc123',
    access_level: 4,
    first_name: 'Mr Delivery',
    surname: 'Agent',
    active: true,
  }, {
    username: 'deli2',
    secret: 'abc123',
    access_level: 4,
    first_name: 'Ms Delivery',
    surname: 'Agent',
    active: true,
  }];
  const orderIds = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let deliveryItems = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => models['WarehouseTest'].insertMany(warehouses))
      .then(() => lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(el => !el.is_hub && !el.has_customer_pickup)))
      .then(res => {
        salesManager = res;
        salesManager._id = res.aid;
        return lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(el => el.has_customer_pickup && name === 'پالادیوم'));
      })
      .then(res => {
        shopClerk1 = res;
        shopClerk1._id = res.aid;
        return lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(el => el.has_customer_pickup && name === 'سانا'));
      })
      .then(res => {
        shopClerk2 = res;
        shopClerk2._id = res.aid;

        const customerId = mongoose.Types.ObjectId();
        const addressId = mongoose.Types.ObjectId();

        deliveryItems = [{
          order_id: orderIds[0],
          order_line_id: mongoose.Types.ObjectId(),
          send: {
            customer: {
              id: customerId,
              address_id: addressId,
            }
          },
          processed_by: salesManager._id,
          sender: agentList[2]._id,
          start_date: Date(2010, 10, 10),
          end_date: Date(2010, 10, 15)
        }, {
          order_id: orderIds[0],
          order_line_id: mongoose.Types.ObjectId(),
          send: {
            customer: {
              id: customerId,
              address_id: addressId,
            }
          },
          processed_by: agentList[1]._id,
          sender: agentList[3]._id,
          start_date: Date(2010, 10, 10),
          end_date: Date(2010, 10, 15)
        }, {
          order_id: orderIds[1],
          order_line_id: mongoose.Types.ObjectId(),
          send: {
            customer: {
              id: customerId,
              address_id: addressId,
            }
          },
          processed_by: salesManager._id,
          sender: agentList[2]._id,
          start_date: Date(2010, 10, 10),
          end_date: Date(2010, 10, 15)
        }, {
          order_id: orderIds[0],
          order_line_id: mongoose.Types.ObjectId(),
          return: {
            warehouse_id: warehouses[0]._id,
          },
          processed_by: agentList[1]._id,
          sender: agentList[2]._id,
          start_date: Date(2010, 11, 10),
          end_date: Date(2010, 11, 15)
        }, {
          order_id: orderIds[2],
          order_line_id: mongoose.Types.ObjectId(),
          send: {
            customer: {
              id: customerId,
              address_id: addressId,
            }
          },
          processed_by: shopClerk2._id,
          sender: agentList[3]._id,
          start_date: new Date(),
        }, {
          order_id: orderIds[2],
          order_line_id: mongoose.Types.ObjectId(),
          send: {
            customer: {
              id: customerId,
              address_id: addressId,
            },
          },
          processed_by: shopClerk2._id,
        }];

        return models['DeliveryTest'].insertMany(deliveryItems);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.error(err);
        done();
      });
  });

  it("Palladium's shop clerk should get list of related delivery items", function (done) {

  });

  it("Sales manager should get list of related delivery items", function (done) {

  });

  it("Sana's shop clerk should get list of related delivery items", function (done) {

  });

  it("Sales manager should update the delivery details", function (done) {

  });

  it("Palladium's shop clerk should assign delivery agent, date and time for delivery item", function (done) {

  });
})