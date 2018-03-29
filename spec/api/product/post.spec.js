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
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});
describe("Post product colors & images", () => {

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


  it("should not add a color with its images if colors array is empty and it doesn't have thumbnail", function (done) {

    let colorId = mongoose.Types.ObjectId();

    this.done = done;

    rp.post({
      url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/false`),
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
    }).catch(res => {
      expect(res.statusCode).toBe(404);
      return models['ProductTest'].find({});
    }).then(res => {

      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(0);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should add a color with its images if colors array already contains that color and it has thumbnail", function (done) {

    let preColorId = mongoose.Types.ObjectId();
    let colorId = mongoose.Types.ObjectId();

    this.done = done;

    models['ProductTest'].update({
      '_id': productId
    }, {
      $set: {
        'colors': [{
          'color_id': preColorId,
          'image': {
            'thumbnail': 'th',
            'angles': ['some url1', 'some url 2', 'some url 3'],
          }
        }],
      }
    }).then(res =>
      rp.post({
        url: lib.helpers.apiTestURL(`product/image/${productId}/${preColorId}/false`),
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
      })).then(res => {
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({}).lean();

    }).then(res => {

      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(1);
      expect(res[0].colors[0].color_id).toEqual(preColorId);
      expect(res[0].colors[0].image.angles.length).toBe(4);
      expect(res[0].colors[0].image.thumbnail).toContain('th');
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
      image: {
        angles: [_path + path.sep + 'test1.jpeg']
      }
    };
    return models['ProductTest'].update({
        "_id": productId,
      },
      {
        $set: {
          'colors': [preColor]
        }
      })
      .then(res => {
          models['ProductTest'].findOne({"_id": productId}).then(res => {
            console.log("ans", res);
            console.log("!", res.colors[0].image);
          });
          return rp.post({
            url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/false`),
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
        return models['ProductTest'].find({}).lean();

      }).then(res => {
        // console.log("@", res[0]);
        // console.log("@@", res[0].colors[0]);
        // console.log("@@@", res[0].colors[0].image);
        expect(res.length).toBe(1);
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id).toEqual(colorId);
        expect(res[0].colors[0].image.angles[0]).toContain(productId);
        expect(res[0].colors[0].image.angles[0]).toContain(colorId);
        expect(res[0].colors[0].image.angles[1]).toContain(productId);
        expect(res[0].colors[0].image.angles[1]).toContain(colorId);
        expect(res[0].colors[0].image.angles[0]).toContain('test1.jpeg');
        expect(res[0].colors[0].image.angles[1]).toContain('test2.jpeg');
        done();

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should add a color with its thumbnail if colors array is empty", function (done) {

    let colorId = mongoose.Types.ObjectId();

    this.done = done;

    rp.post({
      url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/true`),
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
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({});

    }).then(res => {

      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(1);
      expect(res[0].colors[0].color_id).toEqual(colorId);
      expect(res[0].colors[0].image.thumbnail).toContain(productId);
      expect(res[0].colors[0].image.thumbnail).toContain(colorId);
      expect(res[0].colors[0].image.thumbnail).toContain('test1.jpeg');
      expect(res[0].colors[0].image.angles.length).toBe(0);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should add a color with its thumbnail if colors array already contains color (angles and thumbnails)", function (done) {

    let preColorId = mongoose.Types.ObjectId();
    let colorId = mongoose.Types.ObjectId();

    this.done = done;
    let thumbName = 'th url';

    models['ProductTest'].update({
      '_id': productId
    }, {
      $set: {
        'colors': [{
          'color_id': preColorId,
          'image': {
            'angles': ['some url1', 'some url 2', 'some url 3'],
            'thumbnail': thumbName
          }
        }],
      }
    }).then(res =>
      rp.post({
        url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/true`),
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
      })).then(res => {
      expect(res.statusCode).toBe(200);
      return models['ProductTest'].find({}).lean();

    }).then(res => {

      expect(res.length).toBe(1);
      expect(res[0].colors.length).toBe(2);
      expect(res[0].colors[0].color_id).toEqual(preColorId);
      expect(res[0].colors[1].color_id).toEqual(colorId);
      expect(res[0].colors[0].image.angles.length).toBe(3);
      expect(res[0].colors[0].image.thumbnail).toBe(thumbName);
      expect(res[0].colors[1].image.angles.length).toBe(0);
      expect(res[0].colors[1].image.thumbnail).toContain(colorId);
      expect(res[0].colors[1].image.thumbnail).toContain(productId);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should update thumbnail on an existing color with thumbnail", function (done) {

    this.done = done;

    let colorId = mongoose.Types.ObjectId();

    let _path = env.uploadProductImagePath + path.sep + 'test' + path.sep + productId + path.sep + colorId;
    shell.mkdir('-p', _path);
    copyFileSync('spec/api/product/test1.jpeg', _path + path.sep + 'test1.jpeg');

    let preColor = {
      color_id: colorId,
      image: {
        thumbnail: _path + path.sep + 'test1.jpeg'
      }
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
          url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/true`),
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
      ).then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();

      }).then(res => {
        // console.log("@", res[0]);
        // console.log("@@", res[0].colors[0]);
        // console.log("@@@", res[0].colors[0].image);
        expect(res.length).toBe(1);
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id).toEqual(colorId);
        expect(res[0].colors[0].image.thumbnail).toContain(productId);
        expect(res[0].colors[0].image.thumbnail).toContain(colorId);
        expect(res[0].colors[0].image.thumbnail).toNotContain('test1.jpeg');
        expect(res[0].colors[0].image.thumbnail).toContain('test2.jpeg');
        done();

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('should add a thumbnail and two angles on an existing color without thumbnail and with other angles', function (done) {
    this.done = done;
    let colorId = mongoose.Types.ObjectId();

    let _path = env.uploadProductImagePath + path.sep + 'test' + path.sep + productId + path.sep + colorId;
    shell.mkdir('-p', _path);
    copyFileSync('spec/api/product/test1.jpeg', _path + path.sep + 'test1.jpeg');

    let preColor = {
      color_id: colorId,
      image: {
        angles: [_path + path.sep + 'test1.jpeg'],
        thumbnail: _path + path.sep + 'test1.jpeg'
      }
    };
    return models['ProductTest'].update({
      "_id": productId,
    }, {
      $set: {
        'colors': [preColor]
      }
    })
      .then(res =>
        rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/false`),
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
      ).then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();
      }).then(res => {
        expect(res.length).toBe(1);
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].color_id).toEqual(colorId);
        expect(res[0].colors[0].image.angles.length).toBe(2);

        return rp.post({
          url: lib.helpers.apiTestURL(`product/image/${productId}/${colorId}/true`),
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
      }).then(res => {
        expect(res.statusCode).toBe(200);
        return models['ProductTest'].find({}).lean();
      }).then(res => {
        expect(res.length).toBe(1);
        expect(res[0].colors.length).toBe(1);
        expect(res[0].colors[0].image.angles.length).toBe(2);
        expect(res[0].colors[0].image.thumbnail).toContain('test2.jpeg');
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
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
        barcode: 1000
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

  let brandId, typeId, tagIds , tagGroupIds;
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
