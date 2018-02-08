const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Post product basics", () => {

  let productId, brandId, typeId;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
        });
        return product.save();
      })
      .then(res => {
        typeId = mongoose.Types.ObjectId();
        brandId = mongoose.Types.ObjectId();

        productId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should update basic info of product", function (done) {

    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        id: productId,
        name: 'changed name',
        product_type: typeId,
        brand: brandId,
        base_price: 50000,
        desc: 'some description for this product',
      },
      json: true,
      resolveWithFullResponse:
        true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].name).toBe('changed name');
      expect(res[0].base_price).toBe(50000);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

describe("Post product instances", () => {

  let productId, productInstanceId, productColorId;
  productColorId = mongoose.Types.ObjectId();
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          instances:[
            {
              product_color_id: productColorId,
              size: 8.5,
              price: 20000
            }

          ]

        });
        return product.save();
      })
      .then(res => {
        productInstanceId = res.instances[0]._id;
        productId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should update basic info of a product instance", function (done) {

    let newProductColorId = mongoose.Types.ObjectId();
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        id: productId,
        productInstanceId,
        productColorId: productColorId,
        size: 10,
        price: 60000
      },
      json: true,
      resolveWithFullResponse:
        true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].instances.length).toBe(1);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId);
      expect(res[0].instances[0].size).toBe(10);
      expect(res[0].instances[0].price).toEqual(60000);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should not update product_color_id of a product instance", function (done) {

    let newProductColorId = mongoose.Types.ObjectId();
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        id: productId,
        productInstanceId,
        productColorId: newProductColorId,
        size: 10,
        price: 60000
      },
      json: true,
      resolveWithFullResponse:
        true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});


describe("Post Product instance inventories", () => {

  let productId, productInstanceId;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          instances: [{
            product_color_id: mongoose.Types.ObjectId(),
            size: 8.5,
            price: 3000
          }]
        });
        return product.save();

      })
      .then(res => {
        productId = res._id;
        productInstanceId = res.instances[0]._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should update non existing inventory info for a product instance", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/inventory`),
      body: {
        id: productId,
        productInstanceId,
        warehouseId,
        count: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].instances.length).toBe(1);
      expect(res[0].instances[0].inventory.length).toBe(1);
      expect(res[0].instances[0].inventory[0].warehouse_id).toEqual(warehouseId);
      expect(res[0].instances[0].inventory[0].count).toEqual(5);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should update count for current inventory", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();

    models['ProductTest'].findOneAndUpdate({_id: productId},
      {
        $push: {
          "instances.0.inventory": {
            warehouse_id: warehouseId,
            count: 5
          }
        }
      }, {new: true})
      .then(res => {
        return rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`product/instance/inventory`),
          body: {
            id: productId,
            productInstanceId,
            warehouseId,
            count: 6
          },
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();
      }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].instances.length).toBe(1);
      expect(res[0].instances[0].inventory.length).toBe(1);
      expect(res[0].instances[0].inventory[0].warehouse_id).toEqual(warehouseId);
      expect(res[0].instances[0].inventory[0].count).toEqual(6);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("expect error when product id is not declared in the body", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/inventory`),
      body: {
        // id: productId,
        productInstanceId,
        warehouseId,
        count: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productIdRequired.status);
        expect(err.error).toBe(error.productIdRequired.message);
        done();
      });
  });
  it("expect error when product instance id is not declared in the body", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/inventory`),
      body: {
        id: productId,
        // productInstanceId,
        warehouseId,
        count: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productInstanceIdRequired.status);
        expect(err.error).toBe(error.productInstanceIdRequired.message);
        done();
      });
  });
  it("expect error when product instance count is not declared in the body", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/inventory`),
      body: {
        id: productId,
        productInstanceId,
        warehouseId,
        // count: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productInstanceCountRequired.status);
        expect(err.error).toBe(error.productInstanceCountRequired.message);
        done();
      });
  });
  it("expect error when product instance warehouse id is not declared in the body", function (done) {

    this.done = done;
    let warehouseId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/inventory`),
      body: {
        id: productId,
        productInstanceId,
        // warehouseId,
        count: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productInstanceWarehouseIdRequired.status);
        expect(err.error).toBe(error.productInstanceWarehouseIdRequired.message);
        done();
      });
  });

});
