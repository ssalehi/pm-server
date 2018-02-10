const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Put product basics", () => {

  let brandId, typeId;
  let adminObj = {
    aid: null,
    jar: null,
  };

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
        brandId = mongoose.Types.ObjectId();
        typeId = mongoose.Types.ObjectId();
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add a new product", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        product_type: typeId,
        brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should second product when there is already one", function (done) {

    this.done = done;

    let product = new models['ProductTest']({
      name: 'sample name 1',
      product_type: typeId,
      brand: brandId,
      base_price: 20000,
      desc: 'some description for this product',
    });
    product.save()
      .then(res =>
        rp({
          method: 'put',
          uri: lib.helpers.apiTestURL(`product`),
          body: {
            name: 'sample name',
            product_type: typeId,
            brand: brandId,
            base_price: 30000,
            desc: 'some description for this product',
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        })).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(2);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("expect error when name of product is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        // name: 'sample name',
        product_type: typeId,
        brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productNameRequired.status);
        expect(err.error).toBe(error.productNameRequired.message);
        done();
      });

  });
  it("expect error when product type of product is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        // product_type: typeId,
        brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productTypeRequired.status);
        expect(err.error).toBe(error.productTypeRequired.message);
        done();
      });

  });
  it("expect error when brand of product is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        product_type: typeId,
        // brand: brandId,
        base_price: 30000,
        desc: 'some description for this product',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productBrandRequired.status);
        expect(err.error).toBe(error.productBrandRequired.message);
        done();
      });

  });
  it("expect error when base of product is not defined", function (done) {

    this.done = done;

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product`),
      body: {
        name: 'sample name',
        product_type: typeId,
        brand: brandId,
        // base_price: 30000,
        desc: 'some description for this product',
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productBasePriceRequired.status);
        expect(err.error).toBe(error.productBasePriceRequired.message);
        done();
      });

  });


});

describe("Put product instance basics", () => {

  let productId;
  let adminObj = {
    aid: null,
    jar: null,
  };


  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;
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
        productId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it("should add a new instance for a product", function (done) {

    this.done = done;

    let productColorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        id: productId,
        productColorId,
        size: 8.5,
        price: 3000
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].instances.length).toBe(1);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId);
      expect(res[0].instances[0].size).toBe(8.5);
      expect(res[0].instances[0].price).toBe(3000);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("expect error when id of product is not declared in the body", function (done) {
    let productColorId = mongoose.Types.ObjectId();
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        // id: productId,
        productColorId,
        size: 8.5,
        price: 3000
      },
      jar: adminObj.jar,
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
  it("expect error when product_id_color of product instance is not declared in the body", function (done) {
    this.done = done;
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        id: productId,
        // productColorId,
        size: 8.5,
        price: 3000
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorIdRequired.status);
        expect(err.error).toBe(error.productColorIdRequired.message);
        done();
      });

  });
  it("expect error when size of product instance is not declared in the body", function (done) {
    this.done = done;
    let productColorId = mongoose.Types.ObjectId();

    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/instance`),
      body: {
        id: productId,
        productColorId,
        // size: 8.5,
        price: 3000
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productInstanceSizeRequired.status);
        expect(err.error).toBe(error.productInstanceSizeRequired.message);
        done();
      });

  });

});


