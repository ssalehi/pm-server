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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;
        let product = models['ProductTest']({
          name: 'sample name',
          product_type: {
            name: 'Shoes',
            product_type_id: typeId
          },
          brand: {
            name: 'Nike',
            brand_id: brandId
          },
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',

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
        details: 'some details for this product',
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
      expect(res[0].desc).toBe('some description for this product');
      expect(res[0].details).toBe('some details for this product');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
describe("Post product colors & images", () => {

  let productId, brandId, typeId, color;
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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ColorTest'].insertMany({name: 'green'});
      })
      .then(res => {
        color = res[0];
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;
        let product = models['ProductTest']({
          name: 'sample name',
          product_type: {
            name: 'Shoes',
            product_type_id: typeId
          },
          brand: {
            name: 'Nike',
            brand_id: brandId
          },
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',
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


  it("should add new thumbnail to existing color", function (done) {

    this.done = done;

    return models['ProductTest'].update({
      "_id": productId,
    },
      {
        $set: {
          'colors': [{
            color_id: color._id,
            name: color.name,
          }]
        }
      })
      .then(res => {
        return rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${color._id}/true`),
          formData: {
            file: {
              value: fs.readFileSync('spec/api/product/test1.jpeg'),
              options: {
                filename: 'test1.jpeg',
                contentType: 'image/jpeg'
              }
            }
          },
          jar: adminObj.jar,
          resolveWithFullResponse: true
        })
      }
      ).then(res => {
        expect(res.statusCode).toBe(200);
        let result = JSON.parse(res.body);
        expect(result.downloadURL).toContain('test1');
        expect(result.downloadURL).toContain('jpeg');
        return models['ProductTest'].find({}).lean();

      }).then(res => {
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id.toString()).toBe(color._id.toString());
        expect(res[0].colors[0].image.thumbnail).toContain('test1');
        expect(res[0].colors[0].image.thumbnail).toContain('jpeg');
        expect(res[0].colors[0].image.thumbnail).toContain('-');
        done();

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should add an new angle image to existing color", function (done) {

    this.done = done;

    let _path = env.uploadProductImagePath + path.sep + 'test' + path.sep + productId + path.sep + color._id;
    shell.mkdir('-p', _path);
    copyFileSync('spec/api/product/test1.jpeg', _path + path.sep + 'test1.jpeg');

    let preColor = {
      name: color.name,
      color_id: color._id,
      image: {
        thumbnail: 'test1.jpeg'
      }
    };
    return models['ProductTest'].findOneAndUpdate({
      "_id": productId,
    },
      {
        $set: {
          'colors': [preColor]
        }
      }, {new: true})
      .then(res => {
        return rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${color._id}/false`),
          formData: {
            file: {
              value: fs.readFileSync('spec/api/product/test2.jpeg'),
              options: {
                filename: 'test2.jpeg',
                contentType: 'image/jpeg'
              }
            }
          },
          jar: adminObj.jar,
          resolveWithFullResponse: true
        })
      }
      ).then(res => {
        expect(res.statusCode).toBe(200);
        let result = JSON.parse(res.body);
        expect(result.downloadURL).toContain('test2');
        expect(result.downloadURL).toContain('jpeg');
        expect(result.downloadURL).toContain('-');
        return models['ProductTest'].find({}).lean();

      }).then(res => {
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id).toEqual(color._id);
        expect(res[0].colors[0].image.thumbnail).toBe('test1.jpeg');
        expect(res[0].colors[0].image.angles.length).toBe(1);
        expect(res[0].colors[0].image.angles[0]).toContain('test2');
        expect(res[0].colors[0].image.angles[0]).toContain('jpeg');
        expect(res[0].colors[0].image.angles[0]).toContain('-');
        done();

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should not add new image angle when product color is not exist for product", function (done) {

    this.done = done;

    rp.post({
      url: lib.helpers.apiTestURL(`product/image/${productId}/${color._id}/false`),
      formData: {
        file: {
          value: fs.readFileSync('spec/api/product/test1.jpeg'),
          options: {
            filename: 'test1.jpeg',
            contentType: 'image/jpeg'
          }
        }
      },
      jar: adminObj.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when product color is not exists');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorNotExist.status);
        expect(err.error).toBe(error.productColorNotExist.message);
        done();
      });
  });

  it("should not add new image angle when product color not have thumbnail", function (done) {

    this.done = done;
    let _path = env.uploadProductImagePath + path.sep + 'test' + path.sep + productId + path.sep + color._id;
    shell.mkdir('-p', _path);
    copyFileSync('spec/api/product/test1.jpeg', _path + path.sep + 'test1.jpeg');

    let preColor = {
      name: color.name,
      color_id: color._id,
      
    };
    return models['ProductTest'].findOneAndUpdate({
      "_id": productId,
    },
      {
        $set: {
          'colors': [preColor]
        }
      }, {new: true})
      .then(res => {
        return rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${color._id}/false`),
          formData: {
            file: {
              value: fs.readFileSync('spec/api/product/test1.jpeg'),
              options: {
                filename: 'test1.jpeg',
                contentType: 'image/jpeg'
              }
            }
          },
          jar: adminObj.jar,
          resolveWithFullResponse: true
        })
      }).then(res => {
        this.fail('did not failed when product color has no thumbnail');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorThumbnailNotFound.status);
        expect(err.error).toBe(error.productColorThumbnailNotFound.message);
        done();
      });
  });



});
describe("Post product instances", () => {
  let brandId, typeId;

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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;
        let product = models['ProductTest']({
          name: 'sample name',
          product_type: {
            name: 'Shoes',
            product_type_id: typeId
          },
          brand: {
            name: 'Nike',
            brand_id: brandId
          },
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',
          instances: [
            {
              product_color_id: productColorId,
              size: 8.5,
              price: 20000,
              barcode: 50
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
    let newProductColorId = new mongoose.Types.ObjectId();
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/instance/${productId}/${productInstanceId}`),
      body: {
        productColorId: newProductColorId,
        size: 10,
        price: 60000,
        barcode: 1000,
        barcode: 1000,
        desc: 'some description for this product',
        details: 'some details for this product'
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
      expect(res[0].instances[0].product_color_id.toString()).toBe(newProductColorId.toString());
      expect(res[0].instances[0].size).toBe('10');
      expect(res[0].instances[0].price).toEqual(60000);
      expect(res[0].instances[0].barcode).toEqual('1000');
      expect(res[0].desc).toBe('some description for this product');
      expect(res[0].details).toBe('some details for this product');
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
describe("Post Product instance inventories", () => {

  let brandId, typeId;
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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: {
            name: 'Shoes',
            product_type_id: typeId
          },
          brand: {
            name: 'Nike',
            brand_id: brandId
          },
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',
          instances: [
            {
              product_color_id: new mongoose.Types.ObjectId(),
              size: 8.5,
              price: 20000,
              barcode: 50
            }

          ]

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
            count: 6,
            price: 200
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
        expect(res[0].instances[0].price).toBe(200);
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

  let brandId, typeId, tagIds, tagGroupIds;
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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;

        return models['TagGroupTest'].insertMany([
          {name: 'tag group 1'},
          {name: 'tag group 2'}
        ]);

      })
      .then(res => {
        tagGroupIds = res.map(x => x._id);
        return models['TagTest'].insertMany([
          {name: 'tag 1', tag_group_id: tagGroupIds[0]},
          {name: 'tag 2', tag_group_id: tagGroupIds[1]}
        ]);

      })
      .then(res => {
        tagIds = res.map(x => x._id);

        let product = models['ProductTest']({
          name: 'sample name',
          product_type: {
            name: 'Shoes',
            product_type_id: typeId
          },
          brand: {
            name: 'Nike',
            brand_id: brandId
          },
          base_price: 30000,
          desc: 'some description for this product',
          details: 'some details for this product',
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


  it("should add new tag for a product", function (done) {

    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}`),
      body: {
        tagId: tagIds[0]
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
      expect(res[0].tags[0].tag_id.toString()).toBe(tagIds[0].toString());
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("duplicate tag id must not exist in product tags array", function (done) {

    this.done = done;

    models['ProductTest'].update({
      "_id": productId,
    },
      {
        $addToSet: {
          'tags': {
            'name': 'tag 2',
            'tg_name': 'tag group 2',
            'tag_id': tagIds[0]
          }
        }
      })
      .then(res =>
        rp({
          method: 'post',
          uri: lib.helpers.apiTestURL(`product/tag/${productId}`),
          body: {
            tagId: tagIds[0]
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
        expect(res[0].tags[0].tag_id.toString()).toBe(tagIds[0].toString());
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this))
  });

});
