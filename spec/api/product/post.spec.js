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


describe("Post product basics", () => {

  let productId, brandId, typeId;
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
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
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
describe("Post product colors & images", () => {

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

        return new Promise((resolve, reject) => {
          rimraf(env.uploadProductImagePath + path.sep + 'test', function () {
            resolve();
          });

        });

      })
      .then(res => {
        done();

      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add a color with its images if color not exist yet", function (done) {

    let colorId = mongoose.Types.ObjectId();

    this.done = done;

    rp.post({
      url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}`),
      formData: {
        file: {
          value: fs.readFileSync('spec/api/product/test1.jpeg'),
          options: {
            filename: 'test1',
            contentType: 'image/jpeg'
          }
        }
      },
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({}).lean();

    }).then(res => {

      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(1);
      expect(res[0].colors[0].color_id).toEqual(colorId);
      expect(res[0].colors[0].images.length).toBe(1);
      expect(res[0].colors[0].images[0]).toContain(productId);
      expect(res[0].colors[0].images[0]).toContain(colorId);
      expect(res[0].colors[0].images[0]).toContain('test1.jpeg');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should add an new image to existing color", function (done) {

    this.done = done;

    let colorId = mongoose.Types.ObjectId();

    let _path = env.uploadProductImagePath + path.sep + 'test' + path.sep + productId + path.sep + colorId;
    shell.mkdir('-p', _path);
    copyFileSync('spec/api/product/test1.jpeg', _path + path.sep + 'test1.jpeg');

    let preColor = {

      color_id: colorId,
      images: [_path + path.sep + 'test1.jpeg']
    };
    return models['ProductTest'].update({
        "_id": productId,
      },
      {
        $set: {
          'colors': [preColor]
        }
      })
      .then(res =>

        rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}`),
          formData: {
            file: {
              value: fs.readFileSync('spec/api/product/test2.jpeg'),
              options: {
                filename: 'test2',
                contentType: 'image/jpeg'
              }
            }
          },
          jar: adminObj.jar,
          resolveWithFullResponse: true
        }))
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();

      }).then(res => {

        console.log('-> ', res[0].colors[0].images);
        expect(res.length).toBe(1);
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id).toEqual(colorId);
        expect(res[0].colors[0].images.length).toBe(2);
        expect(res[0].colors[0].images[0]).toContain(productId);
        expect(res[0].colors[0].images[0]).toContain(colorId);
        expect(res[0].colors[0].images[1]).toContain(productId);
        expect(res[0].colors[0].images[1]).toContain(colorId);
        expect(res[0].colors[0].images[0]).toContain('test1.jpeg');
        expect(res[0].colors[0].images[1]).toContain('test2.jpeg');
        done();

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
describe("Post product instances", () => {

  let productId, productInstanceId, productColorId;
  productColorId = mongoose.Types.ObjectId();
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
          instances: [
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
      jar: adminObj.jar,
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
      jar: adminObj.jar,
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
          jar: adminObj.jar,
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
      jar: adminObj.jar,
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
      jar: adminObj.jar,
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
      jar: adminObj.jar,
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
describe("Post Product tags", () => {

  let productId, productInstanceId;
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
        productInstanceId = res.instances[0]._id;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should add new tag for a product", function (done) {

    this.done = done;
    let tagId = mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/tag`),
      body: {
        id: productId,
        tagId
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      return models['ProductTest'].find({}).lean();

    }).then(res => {
      expect(res.length).toBe(1);
      expect(res[0].tags.length).toBe(1);
      expect(res[0].tags[0]).toEqual(tagId);
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("duplicate tag id must not exist in product tags array", function (done) {

    this.done = done;
    let tagId = mongoose.Types.ObjectId();

    models['ProductTest'].update({
        "_id": productId,
      },
      {
        $addToSet: {
          'tags': tagId
        }
      })
      .then(res =>
        rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`product/tag`),
          body: {
            id: productId,
            tagId
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        }))
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();

      })
      .then(res => {
        expect(res.length).toBe(1);
        expect(res[0].tags.length).toBe(1);
        expect(res[0].tags[0]).toEqual(tagId);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this))
  });

});
