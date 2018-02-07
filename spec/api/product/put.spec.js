const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

xdescribe("Put product basics", () => {

  let brandId, typeId;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
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

describe("Put product color", () => {

  let productId;
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
        productId = res._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add a new color/images set for a product", function (done) {

    this.done = done;

    let colorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/color`),
      body: {
        id: productId,
        colorId,
        images: ['image 1 url', 'image 2 url']
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      console.log('-> ',res);
      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(1);
      expect(res[0].colors[0].color_id).toEqual(colorId);
      expect(res[0].colors[0].images.length).toBe(2);
      expect(res[0].colors[0].images[0].url).toBe('image 1 url');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  xit("expect error when id of product is not declared in the body", function (done) {

    this.done = done;
    let imageId1= mongoose.Types.ObjectId();
    let imageId2 = mongoose.Types.ObjectId();

    let colorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/color`),
      body: {
        // id: productId,
        colorId,
        images: [imageId1, imageId2]
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
  xit("expect error when color id is not defined", function (done) {

    this.done = done;
    let imageId1= mongoose.Types.ObjectId();
    let imageId2 = mongoose.Types.ObjectId();

    let colorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/color`),
      body: {
        id: productId,
        // colorId,
        images: [imageId1, imageId2]
      },
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
  xit("expect error when images is not declared in body", function (done) {

    this.done = done;

    let colorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/color`),
      body: {
        id: productId,
        colorId,
        // images: []
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorImagesRequired.status);
        expect(err.error).toBe(error.productColorImagesRequired.message);
        done();
      });

  });
  xit("expect error when images is an empty array", function (done) {

    this.done = done;

    let colorId = mongoose.Types.ObjectId();
    rp({
      method: 'put',
      uri: lib.helpers.apiTestURL(`product/color`),
      body: {
        id: productId,
        colorId,
        images: []
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when other users are calling api');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorImagesRequired.status);
        expect(err.error).toBe(error.productColorImagesRequired.message);
        done();
      });

  });

});

xdescribe("Put product instance basics", () => {

  let productId;
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

