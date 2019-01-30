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

    let products = await models()['ProductTest'].insertMany([
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

let changeInventory = async (productId, productInstanceId, warehouseId, delCount, delReserved) => {
  try {

    let foundProduct = await this.ProductModel.findById(mongoose.Types.ObjectId(productId)).lean()
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


    let isSoldOut = await this.checkSoldOutStatus(productId, initialInstance, foundInstance);

    /**
     * if inventory is changed so that the instance its count is not 0 anymore, its flag should be removed and should be removed from sold out collection
     * in opposite, if the instance has no inventory anymore it should be added to sold out collection but
     * its flag should not be changed immediately (because of 1 week off of sold out) 
     */
    if (!isSoldOut && foundInstance.sold_out)
      foundInstance.sold_out = false;

    return this.ProductModel.update({
      _id: mongoose.Types.ObjectId(body.id),
      'instances._id': mongoose.Types.ObjectId(body.productInstanceId)
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

let checkSoldOutStatus = async (productId, initialInstance, changedInstance) => {

  try {
    const totalInitialCount = initialInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    const totalChangedCount = changedInstance.inventory.map(x => x.count).reduce((x, y) => x + y);
    if (totalChangedCount === 0) {
      // when the product counts becomes 0, the product is added to soldout list (not when count - reserved == 0)
      await new SoldOutModel(Product.test).insertProductInstance(productId, initialInstance._id.toString());
      return true;
    }
    else if (totalInitialCount === 0 && totalChangedCount > 0) {
      await new SoldOutModel(Product.test).removeProductInstance(productId, initialInstance._id.toString());
      return false;
    }
  } catch (err) {
    console.log('-> error on check sold out sataus', err);
    throw err;
  }

}


module.exports = {
  makeProducts,
  changeInventory

}