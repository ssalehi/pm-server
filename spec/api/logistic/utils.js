const mongoose = require('mongoose');
const moment = require('moment');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');
const _const = require('../../../lib/const.list');


let makeProducts = async () => {
  try {
    let colorIds = [
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId()
    ];

    let defultInventoires = [];
    warehouses.forEach(x => {
      defultInventoires.push({
        count: 2,
        reserved: 0,
        warehouse_id: x._id
      })
    });

    products = await models()['ProductTest'].insertMany([
      // product 1
      {
        article_no: 'xy123',
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
        colors: [{
            color_id: colorIds[0],
            name: 'green'
          },
          {
            color_id: colorIds[1],
            name: 'yellow'
          }
        ],
        instances: [{ // products1=> instance 1
            product_color_id: colorIds[0],
            size: "10",
            price: 30000,
            barcode: '0394081341',
            inventory: defultInventoires
          },
          { // products1=> instance 2
            product_color_id: colorIds[1],
            size: "11",
            price: 30000,
            barcode: '0394081342',
            inventory: defultInventoires
          }
        ]
      },
      // product 2
      {
        article_no: 'xy124',
        name: 'sample 2',
        product_type: {
          name: 'sample type',
          product_type_id: mongoose.Types.ObjectId()
        },
        brand: {
          name: 'sample brand',
          brand_id: mongoose.Types.ObjectId()
        },
        base_price: 40000,
        desc: 'some description for this product',
        colors: [{
            color_id: colorIds[2],
            name: 'read'
          },
          {
            color_id: colorIds[3],
            name: 'blue'
          }
        ],
        instances: [{ //product 2 => instance 1
            product_color_id: colorIds[2],
            size: "12",
            price: 40000,
            barcode: '0394081343',
            inventory: defultInventoires
          },
          { // product 2 => instance 2
            product_color_id: colorIds[3],
            size: "13",
            price: 40000,
            barcode: '0394081344',
            inventory: defultInventoires
          }
        ]
      }
    ]);
    products = JSON.parse(JSON.stringify(products));
    return products;
  } catch (err) {
    console.log('-> error on makeing test products', err);
    throw err;
  }
}





let makeOrders = async () => {
  try {

    orders = await models()['OrderTest'].insertMany([{ //order 1  => 1 orderlines
      order_time: new Date(),
      is_cart: false,
      transaction_id: 'xyz45300',
      tickets: [{
        is_processed: false,
        _id: mongoose.Types.ObjectId(),
        status: _const.ORDER_STATUS.WaitForAggregation,
        desc: null,
        receiver_id:mongoose.Types.ObjectId(),
        timestamp: new Date()
      }],
      order_lines: [{
        product_id: products[0]._id,
        campaign_info: {
          _id: mongoose.Types.ObjectId(),
          discount_ref: 0
        },
        product_instance_id: products[0].instances[0]._id,
        tickets: [{
          is_processed: false,
          _id: mongoose.Types.ObjectId(),
          status: _const.ORDER_LINE_STATUS.OnlineWarehouseVerified,
          desc: null,
          receiver_id: mongoose.Types.ObjectId(),
          timestamp: new Date()
        }]
      }]
    }, { //order 2  => 2 orderlines
      order_time: new Date(),
      is_cart: false,
      transaction_id: 'xyz45300',
      tickets: [{
        is_processed: false,
        status: _const.ORDER_STATUS.WaitForAggregation,
        desc: null,
        receiver_id:mongoose.Types.ObjectId(),
        timestamp: new Date()
      }],
      order_lines: [{
        product_id: products[0]._id,
        campaign_info: {
          _id: mongoose.Types.ObjectId(),
          discount_ref: 0
        },
        product_instance_id: products[0].instances[1]._id,
        tickets: [{
          is_processed: false,
          status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
          desc: null,
          receiver_id: mongoose.Types.ObjectId(),
          timestamp: new Date()
        }]
      }, {
        product_id: products[0],
        campaign_info: {
          _id: mongoose.Types.ObjectId(),
          discount_ref: 0
        },
        product_instance_id: products[0].instances[1]._id,
        tickets: [{
          is_processed: false,
          status: _const.ORDER_LINE_STATUS.WaitForOnlineWarehouse,
          desc: null,
          receiver_id: mongoose.Types.ObjectId(),
          timestamp: new Date()
        }]
      }]
    }]);
    orders = JSON.parse(JSON.stringify(orders));
    return orders
  } catch (err) {
    console.log('-> error on makeing test orders', err);
    throw err;
  }
}



let makeDeliveries = async () => {
  try {
    deliveries = await models()['DeliveryTest'].insertMany([{ // delivery 1 => external to customer
      to: {
        customer: {
          _id: customer[0]._id,
          address: customer[0].addresses[0]
        }
      },
      from: {
        warehouse_id: warehouses.find(x => x.is_hub)._id,

      },
      order_details: [{
        order_line_ids: [
          orders[0].order_lines[0]._id
        ],
        order_id: orders[0]._id
      }],
      start: new Date(),
      delivery_agent: {
        _id: mongoose.Types.ObjectId(),
      },
      slot: {
        lower_bound: 10,
        upper_bound: 14,
      },
      tickets: [{
        is_processed: false,
        status: _const.DELIVERY_STATUS.default,
        receiver_id: warehouses.find(x => x.is_hub)._id,
        timestamp: new Date()
      }],
      "__v": 0
    }, { // delivery 2 => internal delivery to hub
      to: {
        warehouse_id: warehouses.find(x => x.is_hub)._id

      },
      from: {
        warehouse_id: warehouses.find(x => x.name === 'سانا')._id

      },
      order_details: [{
        order_line_ids: [
          orders[1].order_lines[0]._id
        ],
        order_id: orders[1]._id
      }],
      start: new Date(),
      delivery_agent: {
        _id: mongoose.Types.ObjectId(),
      },
      tickets: [{
        is_processed: false,
        status: _const.DELIVERY_STATUS.default,
        receiver_id: warehouses.find(x => x.is_hub)._id,
        timestamp: new Date()
      }],
      "__v": 0
    }, { // delivery 3 => CC after recieved
      to: {
        warehouse_id: warehouses.find(x => x.name === 'سانا')._id
      },
      from: {
        warehouse_id: warehouses.find(x => x.is_hub)._id
      },
      order_details: [{
        order_line_ids: [
          orders[1].order_lines[0]._id
        ],
        order_id: orders[1]._id
      }],
      start: new Date(),
      delivery_agent: {
        _id: internalagent.aid
      },
      tickets: [{
        is_processed: false,
        status: _const.DELIVERY_STATUS.default,
        receiver_id: warehouses.find(x => x.is_hub)._id,
        timestamp: new Date()
      }],
      "__v": 0
    }])
    deliveries = JSON.parse(JSON.stringify(deliveries));
    return deliveries
  } catch (err) {
    console.log('-> error on makeing test deliveries', err);
    throw err;
  }
}










let makeCustomer = async () => {
  try {
    customer = await models()['CustomerTest'].insertMany([{ // customer 1 : is_guest = false
        id: mongoose.Types.ObjectId(),
        addresses: {
          _id: mongoose.Types.ObjectId(),
          province: "تهران",
          city: "تهران",
          street: "دوم شرقی",
          unit: "6",
          no: "4",
          district: "چاردیواری",
          recipient_title: "m",
          recipient_name: "احسان",
          recipient_surname: "انصاری بصیر",
          recipient_national_id: "0010684281",
          recipient_mobile_no: "0912658369",
          postal_code: "9",
          loc: {
            long: 51.379926,
            lat: 35.696491
          }
        },
        is_guest: false,
        active: true,
        username: "ehsanansari@gmail.com",
        first_name: "ehsan",
        surname: "ansari",
        mobile_no: "0912658369",
        gender: "m",
      },
      { // customer 2: is_guest = true
        addresses: {
          _id: mongoose.Types.ObjectId(),
          province: "گیلان",
          city: "رشت",
          street: "شمالی",
          unit: "3",
          no: "7",
          district: "هفت",
          recipient_title: "m",
          recipient_name: "غزل",
          recipient_surname: "جلیلیان",
          recipient_national_id: "0010684281",
          recipient_mobile_no: "09308329772",
          postal_code: "11",
          loc: {
            long: 51.379926,
            lat: 35.696491
          }
        },
        is_guest: true,
        active: true,
        username: "qazaljl@gmail.com",
        first_name: "qazal",
        surname: "jalilian",
        mobile_no: "09308329772",
        gender: "m",
      }
    ])
    customer = JSON.parse(JSON.stringify(customer));
    return customer
  } catch (err) {
    console.log('-> error on makeing test customers', err);
    throw err;
  }
}
module.exports = {
  makeProducts,
  makeOrders,
  makeDeliveries,
  makeCustomer
}