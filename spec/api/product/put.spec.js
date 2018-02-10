const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Put Product", () => {

  let imageId, brandId, typeId, colorId, warehouseId;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        imageId = mongoose.Types.ObjectId();
        brandId = mongoose.Types.ObjectId();
        typeId = mongoose.Types.ObjectId();
        colorId = mongoose.Types.ObjectId();
        warehouseId = mongoose.Types.ObjectId();
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add a new product", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
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
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({})

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].colors[0]._id.toString()).toEqual(productColorId.toString());
      expect(res[0].instances[0].product_color_id.toString()).toEqual(productColorId.toString());
      expect(res[0].instances[0]._id).not.toBe(null);
      expect(res[0].instances[0].product_color_id.toString()).toEqual(productColorId.toString());
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