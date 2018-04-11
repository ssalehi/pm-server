const lib = require('../../lib/index');
const models = require('../../mongo/models.mongo');
const error = require('../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../lib/const.list');
const Order = require('../../lib/order.model');

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
  let warehouses = [{
    _id: mongoose.Types.ObjectId(),
    name: 'سانا',
    phone: '021 7443 8111',
    has_customer_pickup: true,
    address: {
      province: 'تهران',
      city: 'تهران',
      street: 'اندرزگو'
    }
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'ایران مال',
    phone: 'نا مشخص',
    has_customer_pickup: true,
    address: {
      province: 'تهران',
      city: 'تهران',
      street: 'اتوبان خرازی'
    }
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'پالادیوم',
    phone: ' 021 2201 0600',
    has_customer_pickup: true,
    address: {
      province: 'تهران',
      city: 'تهران',
      street: 'مقدس اردبیلی'
    }
  }, {
    _id: mongoose.Types.ObjectId(),
    name: 'انبار مرکزی',
    phone: 'نا مشخص',
    address: {
      province: 'تهران',
      city: 'تهران',
      street: 'نامشخص'
    },
    is_center: true
  }];

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
          address_id: mongoose.Types.ObjectId(),
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
      expect(res.address_id.toString()).toEqual(addressId.toString());
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
