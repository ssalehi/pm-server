const mongooose = require('mongoose');
const moment = require('moment');
const models = require('../../../mongo/models.mongo');
const warehouses = require('../../../warehouses');


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
        colors: [
          {
            color_id: colorIds[0],
            name: 'green'
          },
          {
            color_id: colorIds[1],
            name: 'yellow'
          }
        ],
        instances: [{
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
        colors: [
          {
            color_id: colorIds[2],
            name: 'read'
          },
          {
            color_id: colorIds[3],
            name: 'blue'
          }
        ],
        instances: [{
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
      }
    ]);

    products = JSON.parse(JSON.stringify(products));

    return products;


  } catch (err) {
    console.log('-> error on makeing test products', err);
    throw err;
  }
}


module.exports = {
  makeProducts

}