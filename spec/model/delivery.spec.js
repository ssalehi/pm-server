const lib = require('../../lib/index');
const models = require('../../mongo/models.mongo');
const error = require('../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../lib/const.list');
const Delivery = require('../../lib/delivery.model');
const warehouses = require('../../warehouses');
const moment = require('moment');

describe('Initiate Delivery', () => {

  let customer1 = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  const orderIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  const orderLineIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  let Orders = [];
  let deliveries = [];

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
              barcode: '0394081341',
              article_no: 'AF12',
              sold_out: false,
            },
            {
              _id: productInstanceIds[1],
              product_color_id: colorIds[1],
              size: "10",
              price: 4000,
              barcode: '19231213123',
              article_no: 'ER12',
              sold_out: false,
            }
          ]
        }];
        return models['ProductTest'].insertMany(products);
      })
      .then(res => {
        Orders = [{
          _id: orderIds[0],
          customer_id: customer1.cid,
          total_amount: 2,
          order_time: new Date(2010, 10, 15),
          is_cart: false,
          address: {
            province: 'Tehran',
            city: 'Tehran',
            district: 3,
            street: 'Shariati',
            unit: 10,
            no: 9,
            postal_code: '8765431',
            loc: {
              long: 51.123,
              lat: 31.123
            },
            recipient_title: 'm',
            recipient_name: 'Ali Agha',
            recipient_surname: 'Aghaee',
            recipient_national_id: '0123456789',
            recipient_mobile_no: '09090909090',
          },
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            _id: orderLineIds[0],
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id,
                status: _const.ORDER_STATUS.default
              }
            ]
          }, { // shop clerk ticket
            _id: orderLineIds[1],
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: []
          }],
          duration_days: 3,
          time_slot: {
            lower_bound: 10,
            upper_bound: 18,
          }
        }, {
          _id: orderIds[1],
          customer_id: customer1.cid,
          order_time: new Date(2010, 10, 10),
          is_cart: false,
          address: {
            province: 'Tehran',
            city: 'Tehran',
            district: 3,
            street: 'Shariati',
            unit: 10,
            no: 9,
            postal_code: '8765431',
            loc: {
              long: 51.123,
              lat: 31.123
            },
            recipient_title: 'm',
            recipient_name: 'Ali Agha',
            recipient_surname: 'Aghaee',
            recipient_national_id: '0123456789',
            recipient_mobile_no: '09090909090',
          },
          order_lines: [
            {
              _id: orderLineIds[2],
              product_id: productIds[0],
              product_instance_id: productInstanceIds[1],
              tickets: [
                {
                  warehouse_id: warehouses.find(x => x.is_hub)._id,
                  status: _const.ORDER_STATUS.default,
                }
              ]
            }
          ],
          duration_days: 2,
          time_slot: {
            lower_bound: 18,
            upper_bound: 22,
          }
        }, {
          _id: orderIds[2],
          customer_id: customer1.cid,
          order_time: new Date(2011, 05, 05),
          is_cart: false,
          order_lines: [
            {
              _id: orderLineIds[3],
              product_id: productIds[1],
              product_instance_id: productInstanceIds[2],
              ticket: [
                {
                  warehouse_id: warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id,
                  status: _const.ORDER_STATUS.default,
                }
              ]
            }
          ],
          address: {
            province: 'Tehran',
            city: 'Tehran',
            district: 3,
            street: 'Shariati',
            unit: 10,
            no: 9,
            postal_code: '8765431',
            loc: {
              long: 51.123,
              lat: 31.123
            },
            recipient_title: 'm',
            recipient_name: 'Ali Agha',
            recipient_surname: 'Aghaee',
            recipient_national_id: '0123456789',
            recipient_mobile_no: '09090909090',
          },
          duration_days: 7,
          time_slot: {
            lower_bound: 18,
            upper_bound: 22,
          }
        }];

        return models['OrderTest'].insertMany(Orders);
      })
      .then(res => {
        return models['DeliveryTest'].insertMany([
          {
            _id: mongoose.Types.ObjectId(),
            order_details: [
              {
                order_id: orderIds[0],
                order_line_ids: [orderLineIds[0]]
              },
            ],
            from: {
              warehouse_id: warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id,
            },
            to: {
              warehouse_id: warehouses.find(x => x.is_hub)._id,
            },
            min_end: new Date(2010, 10, 18),
            min_slot: {
              lower_bound: 10,
              upper_bound: 18,
            }
          },
        ]);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it("should update order_details only (without changing min_end and min_slot)", function (done) {
    Delivery.test = true;
    let delivery = new Delivery(true);

    delivery.initiate(Orders[0], orderLineIds[1], {warehouse_id: warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id}, {warehouse_id: warehouses.find(x => x.is_hub)._id})
      .then(res => {
        expect(res.order_details.length).toBe(1);
        expect(res.order_details[0].order_line_ids.length).toBe(2);
        expect(moment(res.min_end).format('YYYY-MM-DD')).toBe('2010-11-18');
        expect(res.min_slot.lower_bound).toBe(10);
        expect(res.min_slot.upper_bound).toBe(18);
        done();
      })
      .catch(err => {
        fail(err);
        done();
      });
  });

  it("should update order_details, min_end and min_slot properties", function (done) {
    Delivery.test = true;
    let delivery = new Delivery(true);

    delivery.initiate(Orders[1], orderLineIds[2], {warehouse_id: warehouses.find(x => !x.has_customer_pickup && !x.is_hub)._id}, {warehouse_id: warehouses.find(x => x.is_hub)._id})
      .then(res => {
        expect(res.order_details.length).toBe(2);
        const newOrder = res.order_details.find(x => x.order_id.toString() === orderIds[1].toString());
        expect(newOrder.order_line_ids.length).toBe(1);
        expect(moment(res.min_end).format('YYYY-MM-DD')).toBe('2010-11-12');
        expect(res.min_slot.lower_bound).toBe(18);
        expect(res.min_slot.upper_bound).toBe(22);
        done();
      })
      .catch(err => {
        fail(err);
        done();
      });
  });

  it("should add new delivery", function (done) {
    Delivery.test = true;
    let delivery = new Delivery(true);
    delivery.initiate(Orders[2], orderLineIds[3], {warehouse_id: warehouses.find(x => x.is_hub)._id}, {customer: {id: customer1.cid, address_id: mongoose.Types.ObjectId()}})
      .then(res => {
        expect(res.order_details.length).toBe(1);
        expect(res.order_details[0].order_line_ids.length).toBe(1);
        expect(moment(res.min_end).format('YYYY-MM-DD')).toBe('2011-06-12');
        expect(res.min_slot.lower_bound).toBe(18);
        expect(res.min_slot.upper_bound).toBe(22);
        done();
      })
      .catch(err => {
        fail(err);
        done();
      });
  });
});

describe('making shelf code', () => {
  let deliveries;
  let hub_id;
  let deliveries_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models['WarehouseTest'].insertMany(warehouses)
    }).then((res) => {
      hub_id = res.find(w => w.is_hub === true)._id;
      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AZ",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: mongoose.Types.ObjectId()},
          to: {warehouse_id: hub_id},
          shelf_code: "BA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},

        }
      ];

      deliveries_id = deliveries.map(d => d._id);
      return models['DeliveryTest'].insertMany(deliveries)
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should make return AB . First Code after AA', function (done) {
    this.done = done;
    Delivery.test = true;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[3]).then(data => {
      expect(data.exist).toBe(false);
      expect(data.shelf_code).toNotBe("AA");
      expect(data.shelf_code).toBe("AB");
      expect(data.shelf_code).toNotBe("AZ");
      expect(data.shelf_code.length).toBe(2);
      done();
    });
  });

  xit('should make return  AA Because Delivery had shelf_id', function (done) {
    this.done = done;
    Delivery.test = true;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[1]).then(data => {
      expect(data.shelf_code).toBe("AA");
      expect(data.exist).toBe(true);
      expect(data.shelf_code.length).toBe(2);
      done();
    });
  });
  xit('should make -- Because this Delivery is not from hub', function (done) {
    this.done = done;
    Delivery.test = true;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[2]).then(data => {
      expect(data.shelf_code).toBe("--");
      expect(data.shelf_code.length).toBe(2);
      expect(data.exist).toBe(false);
      done();
    });
  });
});

describe('making shelf code', () => {
  let deliveries;
  let hub_id;
  let deliveries_id;
  beforeEach(done => {
    lib.dbHelpers.dropAll().then(() => {
      return models['WarehouseTest'].insertMany(warehouses)
    }).then((res) => {
      hub_id = res.find(w => w.is_hub === true)._id;
      deliveries = [
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AZ",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},
          shelf_code: "AD",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: mongoose.Types.ObjectId()},
          to: {warehouse_id: hub_id},
          shelf_code: "BA",
        },
        {
          _id: mongoose.Types.ObjectId(),
          order_details: {
            order_id: mongoose.Types.ObjectId(),
            order_line_ids: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()]
          },
          from: {warehouse_id: hub_id},
          to: {warehouse_id: mongoose.Types.ObjectId()},

        }
      ];
      deliveries_id = deliveries.map(d => d._id);
      return models['DeliveryTest'].insertMany(deliveries)
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  xit('should make return AA . First possible Code', function (done) {
    this.done = done;
    Delivery.test = true;
    let delivery = new Delivery(true);
    delivery.makeDeliveryShelfCode(deliveries_id[3]).then(data => {
      expect(data.shelf_code).toBe("AA");
      expect(data.exist).toBe(false);
      done();
    });
  });
});