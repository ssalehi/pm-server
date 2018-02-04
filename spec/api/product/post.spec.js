const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Post Product", () => {

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          colors: {
            _id: mongoose.Types.ObjectId(),
            color_id: mongoose.Types.ObjectId(),
            images: [mongoose.Types.ObjectId()]
          },
          instances: [{
            product_color_id: mongoose.Types.ObjectId(),
            size: 8.5,
            price: 30000,
            inventory: [{
              warehouse_id: mongoose.Types.ObjectId(),
              count: 5
            }]
          }]
        });
        return product.save();

      })
      .then(res =>{
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should update product name, brand, and count of a specific instance in warehouse", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'changed name',
        brand: mongoose.Types.ObjectId(),
        instances: [{
          product_color_id: productColorId,
          size: 8.5,
          price: 30000,
          inventory: [{
            warehouse_id: warehouseId,
            count: 5
          }]
        }]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({})

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].colors[0]._id).toEqual(productColorId);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId);
      expect(res[0].instances[0]._id).not.toBe(null);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId);
      expect(res[0].instances[0].inventory[0]._id).not.toBe(null);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("expect error when name of product is not defined", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        // name: 'sample name',
        product_type: typeId,
        brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
        colors: {
          _id: productColorId,
          color_id: colorId,
          images: [imageId]
        },
        instances: [{
          product_color_id: productColorId,
          size: 8.5,
          price: 30000,
          inventory: [{
            warehouse_id: warehouseId,
            count: 5
          }]
        }]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(500);
        expect(err.error).toBe('Product validation failed: name: Path `name` is required.');
        done();
      });

  });
  it("expect error when product type of product is not defined", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        // product_type: typeId,
        brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
        colors: {
          _id: productColorId,
          color_id: colorId,
          images: [imageId]
        },
        instances: [{
          product_color_id: productColorId,
          size: 8.5,
          price: 30000,
          inventory: [{
            warehouse_id: warehouseId,
            count: 5
          }]
        }]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(500);
        expect(err.error).toBe('Product validation failed: product_type: Path `product_type` is required.');
        done();
      });

  });
  it("expect error when brand of product is not defined", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        product_type: typeId,
        // brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
        colors: {
          _id: productColorId,
          color_id: colorId,
          images: [imageId]
        },
        instances: [{
          product_color_id: productColorId,
          size: 8.5,
          price: 30000,
          inventory: [{
            warehouse_id: warehouseId,
            count: 5
          }]
        }]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(500);
        expect(err.error).toBe('Product validation failed: brand: Path `brand` is required.');
        done();
      });

  });

  it("expect error when base of product is not defined", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        product_type: typeId,
        brand: brandId,
        // base_price: 30000,
        desc: 'some description for this product',
        colors: {
          _id: productColorId,
          color_id: colorId,
          images: [imageId]
        },
        instances: [{
          product_color_id: productColorId,
          size: 8.5,
          price: 30000,
          inventory: [{
            warehouse_id: warehouseId,
            count: 5
          }]
        }]
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(500);
        expect(err.error).toBe('Product validation failed: base_price: Path `base_price` is required.');
        done();
      });

  });


});