const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe("Delete Product", () => {

  let brandId, typeId;
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

describe("Delete Product tags", () => {

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
          tags: [
            {name: 'tag 1', tg_name: 'tag group 1', tag_id: tagIds[0]},
            {name: 'tag 2', tg_name: 'tag group 2', tag_id: tagIds[1]}
          ],


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


  it("should remove an existing tag from tags array of product", function (done) {

    this.done = done;
    rp({
      method: 'delete',
      uri: lib.helpers.apiTestURL(`product/tag/${productId}/${tagIds[0]}`),
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
      expect(res[0].tags[0].tag_id.toString()).toBe(tagIds[1].toString());
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

describe("Delete Product colors", () => {

  let productId, brandId, typeId;
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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;

        colorId1 = mongoose.Types.ObjectId();
        colorId2 = mongoose.Types.ObjectId();
        imageURL1 = 'some url 1';
        imageURL2 = 'some url 2';
        imageURL3 = 'some url 3';
        imageURL4 = 'some url 4';

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
          colors: [
            {
              color_id: colorId1,
              name: 'green',
              code: '101',
              image: {
                angles: [imageURL1, imageURL2]
              }
            },
            {
              color_id: colorId2,
              name: 'red',
              code: '205',
              image: {
                angles: [imageURL3, imageURL4]
              }
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
      expect(res[0].colors[0].image.angles.length).toEqual(2);
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

describe("Delete Product instances and inventory", () => {

  let brandId, typeId;
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
        return models['BrandTest'].insertMany({name: 'Nike'});
      })
      .then(res => {
        brandId = res[0]._id;
        return models['ProductTypeTest'].insertMany({name: 'Shoes'});
      })
      .then(res => {
        typeId = res[0]._id;

        productColorId1 = mongoose.Types.ObjectId();
        productColorId2 = mongoose.Types.ObjectId();
        warehouseId1 = mongoose.Types.ObjectId();
        warehouseId2 = mongoose.Types.ObjectId();

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
          instances: [
            {
              product_color_id: productColorId1,
              size: 10,
              price: 60000,
              barcode: '1212',
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
              barcode: '123546',
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
