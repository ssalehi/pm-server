const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('GET Collection', () => {
  let productIds = [];
  let collectionIds = [];
  let brandNames = [];
  let productTypes = [];
  let tagIds = [];
  let tagGroupIds = [];
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

        let brandArr = [{
          name: 'NIKE'
        }, {
          name: 'PUMA'
        }, {
          name: 'SONY'
        }];
        let productTypeArr = [{
          name: 'Shoes'
        }, {
          name: 'Socks'
        }, {
          name: 'Pants'
        }];
        let tagsArr = [{
          name: 'tag1'
        }, {
          name: 'tag2'
        }];
        let tagGroupsArr = [{
          name: 'taggroup1'
        }, {
          name: 'taggroup2'
        }];
        models['ProductTypeTest'].insertMany(productTypeArr).then(res => {
          productTypes[0] = res[0]._id;
          productTypes[1] = res[1]._id;
          productTypes[2] = res[2]._id;

          models['BrandTest'].insertMany(brandArr).then(res => {
            brandNames[0] = res[0]._id;
            brandNames[1] = res[1]._id;
            brandNames[2] = res[2]._id;

            models['TagTest'].insertMany(tagsArr).then(res => {
              tagIds[0] = res[0]._id;
              tagIds[1] = res[1]._id;

              models['TagGroupTest'].insertMany(tagGroupsArr).then(res => {
                tagGroupIds[0] = res[0]._id;
                tagGroupIds[1] = res[1]._id;

                let productArr = [{
                  name: 'product one',
                  product_type: productTypes[0],
                  brand: brandNames[0],
                  base_price: 10000,
                  desc: 'some description for this product one',
                }, {
                  name: 'product two',
                  product_type: productTypes[1],
                  brand: brandNames[1],
                  base_price: 20000,
                  desc: 'some description for this product two',
                }, {
                  name: 'product three',
                  product_type: productTypes[2],
                  brand: brandNames[2],
                  base_price: 3000,
                  desc: 'some description for this product three',
                }];
                models['ProductTest'].insertMany(productArr).then(res => {
                  productIds[0] = res[0]._id;
                  productIds[1] = res[1]._id;
                  productIds[2] = res[2]._id;

                  let collectionArr = [{
                    //manual with products
                    name: 'manual1',
                    is_smart: false,
                    productIds: [productIds[0], productIds[1], productIds[2]]
                  }, {
                    //manual without products
                    name: 'manual2 ',
                    is_smart: false,
                    productIds: [],
                  }, {
                    //smart with detail
                    name: 'smart1',
                    is_smart: true,
                    tagIds: [tagIds[0], tagIds[1]],
                    tagGroupIds: [tagGroupIds[0], tagGroupIds[1]],
                    typeIds: [productTypes[0]]
                  }, {
                    //smart with half detail
                    name: 'smart2',
                    is_smart: true,
                    tagIds: [tagIds[0], tagIds[1]],
                    typeIds: []
                  }];
                  models['CollectionTest'].insertMany(collectionArr).then(res => {
                    collectionIds[0] = res[0]._id;
                    collectionIds[1] = res[1]._id;
                    collectionIds[2] = res[2]._id;
                    collectionIds[3] = res[3]._id;

                    done();
                  });
                });
              });
            });
          });
        });
      }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should return a manual collection with products', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      res = res.body[0];
      expect(res.name).toBe("manual1");
      expect(res.products.length).toBe(3);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should return a smart collection with details', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[2]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      res = res.body[0];
      expect(res.name).toBe("smart1");
      expect(res.products.length).toBe(0);
      expect(res.tags.length).toBe(2);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/1`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('expect error when cid is not valid');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.collectionIdIsNotValid.status);
      expect(err.error).toEqual(error.collectionIdIsNotValid.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  // it('should get all products from collection', function (done) {
  //     this.done = done;
  //     rp({
  //         method: 'get',
  //         uri: lib.helpers.apiTestURL(`collection/products/${collectionIds[0]}`),
  //         jar: adminObj.jar,
  //         json: true,
  //         resolveWithFullResponse: true
  //     }).then(res => {
  //         expect(res.statusCode).toBe(200);
  //         expect(res.body.length).toBe(1);
  //
  //         res = res.body[0];
  //         console.log(res);
  //         expect(res.products.length).toBe(3);
  //         expect(res.products[0].name).toBe('product one');
  //         expect(res.products[0].brand).toBe('NIKE');
  //
  //         done();
  //     }).catch(lib.helpers.errorHandler.bind(this));
  // });

});