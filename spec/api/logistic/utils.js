const mongoose = require('mongoose');
const moment = require('moment');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');
const _const = require('../../../lib/const.list');


let loggedInCustomerAddress = {
  _id: mongoose.Types.ObjectId(),
  province: "تهران",
  city: "تهران",
  street: "kj",
  unit: "16",
  no: "16",
  district: "jgkfjfkj",
  recipient_title: "f",
  recipient_name: "Ehsan",
  recipient_surname: "Ansari Basir",
  recipient_national_id: "0010684281",
  recipient_mobile_no: "09125975586",
  postal_code: "146",
  loc: {
    long: 51.379926,
    lat: 35.696491
  }
};

let guestAddress = {
  _id: mongoose.Types.ObjectId(),
  loc: {
    long: 51.379926,
    lat: 35.696491
  },
  recipient_email: "eabasir@gmail.com",
  recipient_name: "jhjh",
  recipient_surname: "khh",
  recipient_national_id: "1111111111",
  province: "تهران",
  city: "تهران",
  no: "16",
  unit: "16",
  postal_code: "16",
  district: "hjkh",
  recipient_mobile_no: "111111111",
  recipient_title: "m",
  street: "16"
}

let makeProducts = async () => {
  try {
    let colorIds = [
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId(),
      mongoose.Types.ObjectId()
    ];

    let defultInventoires = [];
    warehouses.filter(x => !x.is_hub).forEach(x => {
      defultInventoires.push({
        count: 2,
        reserved: 0,
        warehouse_id: x._id
      })
    });


    let campaigns = await models()['CampaignTest'].insertMany([
      {
        name: 'c1',
        discount_ref: 20,
        start_date: moment().toDate(),
        end_date: moment().add(1, 'd').toDate()
      },
      {
        name: 'c2',
        discount_ref: 15,
        coupon_code: 'xy1234',
        start_date: moment().toDate(),
        end_date: moment().add(1, 'd').toDate()
      }
    ]);

    campaigns = JSON.parse(JSON.stringify(campaigns));

    let products = await models()['ProductTest'].insertMany([
      // product 1 with campaign
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
        campaigns: [campaigns[0]._id],
        instances: [
          {
            product_color_id: colorIds[0],
            size: "10",
            price: 30000,
            barcode: '0394081341',
            inventory: defultInventoires
          },
          {
            product_color_id: colorIds[1],
            size: "11",
            price: 30000,
            barcode: '0394081342',
            inventory: defultInventoires
          }
        ]
      },
      // product 2 with campaign
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
        campaigns: [campaigns[0]._id],
        instances: [
          {
            product_color_id: colorIds[2],
            size: "12",
            price: 40000,
            barcode: '0394081343',
            inventory: defultInventoires
          },
          {
            product_color_id: colorIds[3],
            size: "13",
            price: 40000,
            barcode: '0394081344',
            inventory: defultInventoires
          }
        ]
      },
      // product 3 without campaign
      {
        article_no: 'xy125',
        name: 'sample 3',
        product_type: {
          name: 'sample type',
          product_type_id: mongoose.Types.ObjectId()
        },
        brand: {
          name: 'sample brand',
          brand_id: mongoose.Types.ObjectId()
        },
        base_price: 50000,
        desc: 'some description for this product',
        colors: [{
          color_id: colorIds[4],
          name: 'brown'
        },
        {
          color_id: colorIds[5],
          name: 'blak'
        }
        ],
        instances: [
          {
            product_color_id: colorIds[4],
            size: "14",
            price: 50000,
            barcode: '0394081344',
            inventory: defultInventoires
          },
          {
            product_color_id: colorIds[5],
            size: "15",
            price: 50000,
            barcode: '0394081345',
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

const changeInventory = async (productId, productInstanceId, warehouseId, delCount, delReserved) => {
  try {

    let foundProduct = await models()['ProductTest'].findById(mongoose.Types.ObjectId(productId)).lean()
    if (!foundProduct)
      throw new Error('product not found');

    let foundInstance = foundProduct.instances.find(x => x._id.toString() === productInstanceId.toString());
    if (!foundInstance)
      throw new Error('product instance not found');

    const initialInstance = JSON.parse(JSON.stringify(foundInstance));

    let foundInventory = foundInstance.inventory.find(i => i.warehouse_id.toString() === warehouseId.toString());
    if (!foundInventory)
      throw new Error('inventory not found');

    if (delReserved && foundInventory.reserved + delReserved >= 0 && foundInventory.reserved + delReserved <= foundInventory.count) {
      foundInventory.reserved += delReserved;
    }

    // count number should be changed after reserved
    if (delCount && foundInventory.count + delCount >= 0 && foundInventory.count + delCount >= foundInventory.reserved) {
      foundInventory.count += delCount;
    }


    if (foundInventory.count < foundInventory.reserved || foundInventory.count < 0 || foundInventory.reserved < 0)
      return Promise.reject(error.invalidInventoryCount);


    let isSoldOut = await checkSoldOutStatus(productId, initialInstance, foundInstance);

    /**
     * if inventory is changed so that the instance its count is not 0 anymore, its flag should be removed and should be removed from sold out collection
     * in opposite, if the instance has no inventory anymore it should be added to sold out collection but
     * its flag should not be changed immediately (because of 1 week off of sold out) 
     */
    if (!isSoldOut && foundInstance.sold_out)
      foundInstance.sold_out = false;

    return models()['ProductTest'].update({
      _id: mongoose.Types.ObjectId(productId),
      'instances._id': mongoose.Types.ObjectId(productInstanceId)
    }, {
        $set: {
          'instances.$': foundInstance
        }
      });

  } catch (err) {
    console.log('-> error on change inventory', err);
    throw err;
  }
}

const checkSoldOutStatus = async (productId, initialInstance, changedInstance) => {

  try {
    const totalInitialCount = initialInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    const totalChangedCount = changedInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    if (totalChangedCount === 0) {
      // when the product counts becomes 0, the product is added to soldout list (not when count - reserved == 0)
      await insertProductInstance(productId, initialInstance._id.toString());
      return true;
    }
    else if (totalInitialCount === 0 && totalChangedCount > 0) {
      await removeProductInstance(productId, initialInstance._id.toString());
      return false;
    }
  } catch (err) {
    console.log('-> error on check sold out sataus', err);
    throw err;
  }

}

const insertProductInstance = (productId, productInstanceId) => {
  const soldOut = models()['SoldOutTest']({
    product_id: mongoose.Types.ObjectId(productId),
    product_instance_id: mongoose.Types.ObjectId(productInstanceId)
  });
  return soldOut.save();
}

const removeProductInstance = (productId, productInstanceId) => {
  return models()['SoldOutTest'].find({
    product_id: mongoose.Types.ObjectId(productId),
    product_instance_id: mongoose.Types.ObjectId(productInstanceId)
  }).remove();
}

const makeOrders = async (customer) => {
  try {
    let defaultTicket = {
      is_processed: false,
      status: _const.ORDER_STATUS.WaitForAggregation,
      desc: null,
      receiver_id: mongoose.Types.ObjectId(),
      timestamp: new Date()
    }

    let orders = await models()['OrderTest'].insertMany([
      { //order 1  => order of logged in customer with valid coupon code
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45300',
        coupon_code: 'xy1234',
        coupon_discount: 15,
        customer_id: customer._id,
        address: loggedInCustomerAddress,
        delivery_info: {
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },
          delivery_cost: 30000
        },
        tickets: [defaultTicket],
        is_collect: false,
        total_amount: 30000,
        order_lines: []

      },
      { //order 2  => order of logged in customer without coupon code
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45301',
        customer_id: customer._id,
        address: loggedInCustomerAddress,
        delivery_info: {
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },
          delivery_cost: 30000
        },
        tickets: [defaultTicket],
        is_collect: false,
        total_amount: 30000,
        order_lines: []
      }, { //order 3 => C&C order of logged in customer 
        order_time: new Date(),
        is_cart: false,
        coupon_code: 'xy1234',
        coupon_discount: 15,
        transaction_id: 'xyz45301',
        customer_id: customer._id,
        address: warehouses.find(x => x.name === 'سانا').address,
        delivery_info: {
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },
          delivery_cost: 30000
        },
        tickets: [defaultTicket],
        is_collect: true,
        total_amount: 30000,
        order_lines: []
      },
      { //order 4  => order of guest customer
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45302',
        address: guestAddress,
        delivery_info: {
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },
          delivery_cost: 30000
        },
        tickets: [defaultTicket],
        is_collect: false,
        total_amount: 30000,
        order_lines: []
      },
      { //order 5 => C&C order of guest customer 
        order_time: new Date(),
        is_cart: false,
        transaction_id: 'xyz45302',
        address: warehouses.find(x => x.name === 'سانا').address,
        delivery_info: {
          time_slot: {
            lower_bound: 10,
            upper_bound: 18
          },
          delivery_cost: 30000
        },
        tickets: [defaultTicket],
        is_collect: true,
        total_amount: 30000,
        order_lines: []
      },

    ]);
    orders = JSON.parse(JSON.stringify(orders));
    return orders
  } catch (err) {
    console.log('-> error on makeing test orders', err);
    throw err;
  }
}
module.exports = {
  makeProducts,
  makeOrders,
  changeInventory,
  loggedInCustomerAddress,
  guestAddress
}