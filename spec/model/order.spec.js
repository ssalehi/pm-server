const lib = require('../../lib/index');
const models = require('../../mongo/models.mongo');
const error = require('../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../lib/const.list');
const Order = require('../../lib/order.model');
const rp = require('request-promise');
const warehouses = require('../../warehouses');


describe('POST Order - verify order', () => {

  let customer1 = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let orderIds = [];
  
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return models['WarehouseTest'].insertMany(warehouses)
      })
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
          first_name: 'test 1',
          surname: 'test 1',
        })
      })
      .then(res => {
        customer1.cid = res.cid;
        customer1.jar = res.rpJar;
        let products = [{
          _id: productIds[0],
          name: 'sample 1',
          product_type: {
            name: 'sample type',
            product_type_id: mongoose.Types.ObjectId()
          },
          brand: {
            name: 'sample brand',
            brand_id: mongoose.Types.ObjectId()
          },
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: colorIds[0],
              name: 'green'
            },
            {
              color_id: colorIds[1],
              name: 'yellow'
            },
            {
              color_id: colorIds[2],
              name: 'red'
            }
          ],
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: colorIds[0],
              size: "9",
              price: 2000,
              barcode: '0394081341'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: colorIds[1],
              size: "10",
              price: 4000,
              barcode: '19231213123'
            }
          ]
        }];
        return models['ProductTest'].insertMany(products);
      })
      .then(res => {

        productIds = res.map(x => x._id);

        let orders = [{
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[0].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default
              }
            ]
          }, { // shop clerk ticket
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }]
        }];

        return models['OrderTest'].insertMany(orders);
      })
      .then(res => {
        orderIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });


  it('should verify an order and set default ticket for its order lines ', function (done) {

    this.done = done;
    let transactionId = new mongoose.Types.ObjectId();
    let addressId = new mongoose.Types.ObjectId();

    Order.test = true;
    let order = new Order(true);

    order.verifyOrder(orderIds[0].toString(), addressId.toString(), transactionId.toString())
      .then(res => {
        return models['OrderTest'].find().lean();
      }).then(res => {
      res = res[0];
      expect(res.address._id.toString()).toEqual(addressId.toString());
      expect(res.transaction_id.toString()).toEqual(transactionId.toString());
      expect(res.is_cart).toBeFalsy();
      res.order_lines.forEach(x => {
        expect(x.tickets.length).toBe(1);
        expect(x.tickets[0].warehouse_id.toString()).toEqual(warehouses.find(x => x.is_center)._id.toString());
        expect(x.tickets[0].status).toBe(_const.ORDER_STATUS.default);
        expect(x.tickets[0].is_processed).toBe(true);
      });
      done();

    })
      .catch(err => {
        console.log('-> ', err);
      });
  });

});

describe('POST Order - ORP', () => {
  let _order, _warehouses, _products;
  let customer1 = {
    cid: null,
    jar: null
  };
  // let SMAgent = {
  //   cid: null,
  //   jar: null
  // };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let orderIds = [];
  
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return models['WarehouseTest'].insertMany(warehouses)
      })
      .then(res => {
        _warehouses = res;
        return lib.dbHelpers.addAndLoginCustomer('customer1', '123456', {
          first_name: 'test 1',
          surname: 'test 1',
        })
      })
      .then(res => {
        customer1.cid = res.cid;
        customer1.jar = res.rpJar;
        let products = [{
          _id: productIds[0],
          name: 'sample 1',
          product_type: {
            name: 'sample type',
            product_type_id: mongoose.Types.ObjectId()
          },
          brand: {
            name: 'sample brand',
            brand_id: mongoose.Types.ObjectId()
          },
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: colorIds[0],
              name: 'green'
            },
            {
              color_id: colorIds[1],
              name: 'yellow'
            },
            {
              color_id: colorIds[2],
              name: 'red'
            }
          ],
          instances: [{
            _id: productInstanceIds[0],
            product_color_id: colorIds[0],
            size: "11",
            price: 2000,
            barcode: '0394081341',
            inventory: [{
              count: 2,
              reserved: 1,
              warehouse_id: _warehouses[0]._id
            }, {
              count: 2,
              reserved: 0,
              warehouse_id: _warehouses[1]._id
            }, {
              count: 3,
              reserved: 0,
              warehouse_id: _warehouses[2]._id
            }, {
              count: 4,
              reserved: 0,
              warehouse_id: _warehouses[3]._id
            }]
          },
            {
              _id: productInstanceIds[1],
              product_color_id: colorIds[1],
              size: "10",
              price: 4000,
              barcode: '19231213123',
              inventory: [{
                count: 2,
                reserved: 2,
                warehouse_id: _warehouses[0]._id
              }, {
                count: 3,
                reserved: 0,
                warehouse_id: _warehouses[1]._id
              }, {
                count: 4,
                reserved: 0,
                warehouse_id: _warehouses[2]._id
              }, {
                count: 5,
                reserved: 0,
                warehouse_id: _warehouses[3]._id
              }]
            }
          ]
        }];
        return models['ProductTest'].insertMany(products);
      })
      .then(res => {
        _products = res;
        productIds = res.map(x => x._id);

        let orders = [{
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[1].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: []
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }]
        }, {
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[1].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: []
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }]
        }, {
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: warehouses[2].address,
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: []
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }]
        }, {
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(),
          is_cart: false,
          address: {
            _id: mongoose.Types.ObjectId(),
            province: 'تهران',
            city: 'تهران',
            street: 'مطهری'
          },
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: []
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }]
        }];

        return models['OrderTest'].insertMany(orders);
      })
      .then(res => {
        _order = res;
        orderIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('expect should be set ticket for instance if warehouse have enough count and is_collect is false', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`checkout`),
      body: {
        order_id: _order[0].id,
        cartItems: _order[0].order_lines[0],
        address: _order[0].address,
        transaction_id: _order[0].transaction_id,
        used_point: _order[0].used_point,
        used_balance: _order[0].used_balance,
        total_amount: _order[0].total_amount,
        is_collect: _order[0].is_collect
      },
      json: true,
      resolveWithFullResponse: true,
      jar: customer1.jar
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['OrderTest'].findById(_order[0]._id);
    }).then(res => {
      expect(res._id).toEqual(_order[0]._id);
      expect(res.order_lines[0]._id).toEqual(_order[0].order_lines[0]._id);
      expect(res.order_lines[0].tickets.length).toBe(1);
      expect(res.order_lines[0].tickets[0].status).toBe(1);
      return models['ProductTest'].findById(productIds[0]).lean();
    }).then(res => {
      let _instanceFind = res.instances.find(x => x._id.toString() === productInstanceIds[0].toString());
      expect(_warehouses[0]._id.toString()).toEqual(_instanceFind.inventory[0].warehouse_id.toString());
      expect(_instanceFind.inventory[0].reserved).toBe(1);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect should be set ticket for instance if warehouse have enough count and is_collect is true', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`checkout`),
      body: {
        order_id: _order[1].id,
        cartItems: _order[1].order_lines[0],
        address: _order[0].address,
        transaction_id: _order[1].transaction_id,
        used_point: _order[1].used_point,
        used_balance: _order[1].used_balance,
        total_amount: _order[1].total_amount,
        is_collect: _order[1].is_collect
      },
      json: true,
      resolveWithFullResponse: true,
      jar: customer1.jar
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['OrderTest'].findById(_order[1]._id);
    }).then(res => {
      expect(res._id).toEqual(_order[1]._id);
      expect(res.order_lines[0]._id).toEqual(_order[1].order_lines[0]._id);
      expect(res.order_lines[0].tickets.length).toBe(1);
      expect(res.order_lines[0].tickets[0].status).toBe(1);
      return models['ProductTest'].findById(productIds[0]).lean();
    }).then(res => {
      let _instanceFind = res.instances.find(x => x._id.toString() === productInstanceIds[1].toString());
      expect(_warehouses[1]._id.toString()).toEqual(_instanceFind.inventory[1].warehouse_id.toString());
      expect(_instanceFind.inventory[0].reserved).toBe(2);
      expect(_instanceFind.inventory[1].reserved).toBe(1);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should choose center warehouse to deliver order to customer', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`checkout`),
      body: {
        order_id: _order[3].id,
        cartItems: _order[3].order_lines[0],
        address: {
          _id: mongoose.Types.ObjectId(),
          province: 'تهران',
          city: 'تهران',
          street: 'مطهری'
        },
        transaction_id: _order[3].transaction_id,
        used_point: _order[3].used_point,
        used_balance: _order[3].used_balance,
        total_amount: _order[3].total_amount,
        is_collect: _order[3].is_collect
      },
      json: true,
      jar: customer1.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['OrderTest'].findById(_order[3]._id).lean();

    }).then(res => {
        expect(res.order_lines[0].tickets.length).toBe(1);
        expect(res.order_lines[0].tickets[0].status).toBe(_const.ORDER_STATUS.default);
        expect(res.order_lines[0].tickets[0].warehouse_id.toString()).toBe(warehouses.find(x => x.is_center)._id.toString());
        return models['ProductTest'].findById(productIds[0]).lean();

      }).then(res => {
        let instanceFind = res.instances.find(x => x._id.toString() === productInstanceIds[0].toString());
        expect(_warehouses[0]._id.toString()).toEqual(instanceFind.inventory[0].warehouse_id.toString());
        expect(instanceFind.inventory[0].reserved).toBe(1);
        done();

        })

      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should choose a warehouse to deliver order to center warehouse', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`checkout`),
      body: {
        order_id: _order[1].id,
        order_line_id: _order[1].order_lines,
        address: warehouses.find(x => x.name === 'پالادیوم').address,
        transaction_id: _order[1].transaction_id,

      },
      json: true,
      jar: customer1.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['OrderTest'].findById(_order[1]._id).lean()
    })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(1);
        expect(res.order_lines[0].tickets[0].status).toBe(_const.ORDER_STATUS.default);
        //expect(res.order_lines[0].tickets[0].warehouseId.toString()).toBe(warehouses.find(x => x.name === 'پالادیوم')._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});
