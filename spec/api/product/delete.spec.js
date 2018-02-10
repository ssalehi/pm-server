const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const env = require('../../../env');
const rimraf = require('rimraf');
const copyFileSync = require('fs-copy-file-sync');
const shell = require('shelljs');

describe("Delete Product tags", () => {

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


  it("should remove an existing product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/${productId}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(0);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});

xdescribe("Delete Product tags", () => {

  let productId;
  let tagId1, tagId2;
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
        tagId1 = mongoose.Types.ObjectId();
        tagId2 = mongoose.Types.ObjectId();

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          tags: [tagId1, tagId2]

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


  it("should remove a existing tag from tags array of product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}/${tagId1}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['nModified']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].tags.length).toBe(1);
      expect(res[0].tags[0]).toEqual(tagId2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should not remove a non existing tag from tags array of product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}/${mongoose.Types.ObjectId()}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);

      console.log('-> ', result);
      expect(result['nModified']).toBe(0);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].tags.length).toBe(2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});

xdescribe("Delete Product colors", () => {

  let productId;
  let colorId1, colorId2, imageURL1, imageURL2, imageURL3, imageURL4;
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
        colorId1 = mongoose.Types.ObjectId();
        colorId2 = mongoose.Types.ObjectId();
        imageURL1 = 'some url 1';
        imageURL2 = 'some url 2';
        imageURL3 = 'some url 3';
        imageURL4 = 'some url 4';

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: colorId1,
              images: [imageURL1, imageURL2]
            },
            {
              color_id: colorId2,
              images: [imageURL3, imageURL4]
            }
          ]

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


  it("should remove existing color of a product containing its images", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/color/${productId}/${colorId1}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['nModified']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].colors.length).toBe(1);
      expect(res[0].colors[0].color_id).toEqual(colorId2);
      expect(res[0].colors[0].images.length).toEqual(2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should not remove not existing color of a product containing its images", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/color/${productId}/${mongoose.Types.ObjectId()}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['nModified']).toBe(0);
      expect(result['ok']).toBe(1);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

xdescribe("Delete Product instances and inventory", () => {

  let productId;
  let productColorId1, productColorId2, warehouseId1, warehouseId2;
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
        productColorId1 = mongoose.Types.ObjectId();
        productColorId2 = mongoose.Types.ObjectId();
        warehouseId1 = mongoose.Types.ObjectId();
        warehouseId2 = mongoose.Types.ObjectId();

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: mongoose.Types.ObjectId(),
          brand: mongoose.Types.ObjectId(),
          base_price: 30000,
          desc: 'some description for this product',
          instances: [
            {
              product_color_id: productColorId1,
              size: 10,
              price: 60000,
              inventory: [
                {
                  warehouse_id: warehouseId1,
                  count: 20
                },
                {
                  warehouse_id: warehouseId2,
                  count: 30
                }
              ]
            },
            {
              product_color_id: productColorId2,
              size: 10,
              price: 60000,
              inventory: [
                {
                  warehouse_id: warehouseId1,
                  count: 45
                },
              ]
            }
          ]

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


  it("should remove existing instance of a product containing its inventories", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/instance/${productId}/${productColorId1}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(1);
      expect(result['nModified']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].instances.length).toBe(1);
      expect(res[0].instances[0].product_color_id).toEqual(productColorId2);
      expect(res[0].instances[0].inventory.length).toEqual(1);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should not remove not existing instance of a product containing its inventories", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/instance/${productId}/${mongoose.Types.ObjectId()}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(1);
      expect(result['nModified']).toBe(0);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].instances.length).toBe(2);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should remove existing inventory of a product instance", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/instance/inventory/${productId}/${productColorId1}/${warehouseId1}`),
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result['n']).toBe(1);
      expect(result['nModified']).toBe(1);
      expect(result['ok']).toBe(1);
      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res[0].instances.length).toBe(2);
      expect(res[0].instances[0].inventory.length).toBe(1);
      expect(res[0].instances[1].inventory.length).toBe(1);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });


});
