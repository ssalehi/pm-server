const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('GET Collection Basics', () => {
  let collectionIds = [];
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

        let collectionArr = [{
          name: 'collection 1',
        }, {
          name: 'collection 2',
        }];
        return models['CollectionTest'].insertMany(collectionArr)
      })
      .then(res => {
        collectionIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return collection info', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      expect(res.body.name).toBe('collection 1');
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
describe('GET Collection Types', () => {
  let collectionIds = [];
  let productTypeIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  let productTypeArr = [{
    name: 'Shoes'
  }, {
    name: 'Socks'
  }, {
    name: 'Pants'
  }];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['ProductTypeTest'].insertMany(productTypeArr)
      })
      .then(res => {
        productTypeIds = res.map(x => x._id);

        let collectionArr = [{
          name: 'collection test',
          typeIds: productTypeIds,
        }];
        return models['CollectionTest'].insertMany(collectionArr)
      })
      .then(res => {
        collectionIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return collection types', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/types/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let types = res.body.types;
      expect(types.length).toBe(3);
      types.map(x => x.name).forEach(name => expect(productTypeArr.map(y => y.name)).toContain(name));

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/types/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/types/${collectionIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
describe('GET Collection Tags', () => {
  let collectionIds = [];
  let tagIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };
  let tagGroupId1 = new mongoose.Types.ObjectId();
  let tagGroupId2 = new mongoose.Types.ObjectId();
  let tagGroupsArr = [
    {
      _id: tagGroupId1,
      name: 'Gender',
      is_required: false
    },
    {
      _id: tagGroupId2,
      name: 'Division',
      is_required: true
    }
  ];
  let tagsArr = [{
    name: 'tag1',
    tag_group_id: tagGroupId1
  }, {
    name: 'tag2',
    tag_group_id: tagGroupId2
  }];
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['TagGroupTest'].insertMany(tagGroupsArr)
      })
      .then(res => {
        return models['TagTest'].insertMany(tagsArr)
      })
      .then(res => {
        tagIds = res.map(x => x._id);

        let collectionArr = [{
          name: 'collection test',
          tagIds,
        }];
        return models['CollectionTest'].insertMany(collectionArr)
      })
      .then(res => {
        collectionIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return collection tags', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/tags/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let tags = res.body.tags;
      expect(tags.length).toBe(2);
      tags.map(x => x.name).forEach(name => expect(tagsArr.map(y => y.name)).toContain(name));
      tags.map(x => x.tg_name).forEach(tg_name => expect(tagGroupsArr.map(y => y.name)).toContain(tg_name));

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/tags/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/tags/${collectionIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
describe('GET Collection Manual Products', () => {
  let productIds = [];
  let collectionIds = [];
  let colorIds = [];
  let brandIds = [];
  let productTypeIds = [];
  let tagIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };

  let brandArr = [{
    name: 'NIKE'
  }];
  let productTypeArr = [{
    name: 'Shoes'
  },
    {
      name: 'Clothes',
    }];

  let tagGroupId1 = new mongoose.Types.ObjectId();
  let tagGroupsArr = [
    {
      _id: tagGroupId1,
      name: 'Gender',
      is_required: false
    }];
  let tagsArr = [{
    name: 'tag1',
    tag_group_id: tagGroupId1
  }];
  let colorArr = [
    {
      color_id: 101,
      name: 'green',
    }];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['TagGroupTest'].insertMany(tagGroupsArr)
      })
      .then(res => {
        return models['ProductTypeTest'].insertMany(productTypeArr)
      })
      .then(res => {

        productTypeIds = res.map(x => x._id);

        return models['ColorTest'].insertMany(colorArr)
      })
      .then(res => {
        colorIds = res.map(x => x._id);
        return models['BrandTest'].insertMany(brandArr)
      })
      .then(res => {
        brandIds = res.map(x => x._id);
        return models['TagTest'].insertMany(tagsArr)
      })
      .then(res => {
        tagIds = res.map(x => x._id);

        let productArr = [
          {
            name: 'product one',
            product_type: productTypeIds[0],
            brand: brandIds[0],
            base_price: 1000
          }, {
            name: 'product two',
            product_type: productTypeIds[0],
            brand: brandIds[0],
            base_price: 1000
          },
          {
            name: 'product three',
            product_type: productTypeIds[0],
            brand: brandIds[0],
            tags: [tagIds[0]],
            base_price: 1000
          },
          {
            name: 'product four',
            product_type: productTypeIds[1],
            brand: brandIds[0],
            base_price: 1000
          }
        ];
        return models['ProductTest'].insertMany(productArr)
      })
      .then(res => {
        productIds = res.map(x => x._id);

        let collectionArr = [{
          name: 'collection 1',
          is_smart: true,
          productIds: [productIds[0], productIds[1]],
          tagIds: tagIds,
          typeIds: productTypeIds
        }];
        return models['CollectionTest'].insertMany(collectionArr)
      })
      .then(res => {
        collectionIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return collection tags', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/manual/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('collection 1');
      let products = res.body.products;
      expect(products.length).toBe(2);
      products.map(x => x.name).forEach(name => expect(['product one', 'product two']).toContain(name));
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when cid is not valid', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/manual/1`),
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
  it('should get error when admin is not calling the api', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/manual/${collectionIds[0]}`),
      // jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when non admin user is calling the api');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.adminOnly.status);
      expect(err.error).toEqual(error.adminOnly.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });


});
describe('GET Collection Products', () => {
  let productIds = [];
  let collectionIds = [];
  let colorIds = [];
  let brandIds = [];
  let productTypeIds = [];
  let tagIds = [];
  let adminObj = {
    aid: null,
    jar: null,
  };

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

  let tagGroupId1 = new mongoose.Types.ObjectId();
  let tagGroupId2 = new mongoose.Types.ObjectId();
  let tagGroupsArr = [
    {
      _id: tagGroupId1,
      name: 'Gender',
      is_required: false
    },
    {
      _id: tagGroupId2,
      name: 'Division',
      is_required: true
    }
  ];
  let tagsArr = [{
    name: 'tag1',
    tag_group_id: tagGroupId1
  }, {
    name: 'tag2',
    tag_group_id: tagGroupId2
  }];
  let colorArr = [
    {
      color_id: 101,
      name: 'green',
    },
    {
      color_id: 102,
      name: 'red',
    },
    {
      color_id: 103,
      name: 'blue',
    },
  ];

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['TagGroupTest'].insertMany(tagGroupsArr)
      })
      .then(res => {
        return models['ProductTypeTest'].insertMany(productTypeArr)
      })
      .then(res => {

        productTypeIds = res.map(x => x._id);

        return models['ColorTest'].insertMany(colorArr)
      })
      .then(res => {

        colorIds = res.map(x => x._id);
        return models['BrandTest'].insertMany(brandArr)
      })
      .then(res => {
        brandIds = res.map(x => x._id);
        return models['TagTest'].insertMany(tagsArr)
      })
      .then(res => {
        tagIds = res.map(x => x._id);

        let productArr = [{
            name: 'product one',
            product_type: productTypeIds[0],
            brand: brandIds[0],
            base_price: 10000,
            desc: 'some description for this product one',
            colors: [
              {
                color_id: colorIds[0],
                images: []
              }
            ],
            instances: [
              {
                size: 1,
                barcode: 101
              }
            ]
          }, {
            name: 'product two',
            product_type: productTypeIds[1],
            brand: brandIds[1],
            base_price: 20000,
            desc: 'some description for this product two',
            tags: [tagIds[0], tagIds[1]],
            colors: [
              {

                color_id: colorIds[1],
                images: []
              }
            ],
            instances: [
              {
                inventory: [{
                  warehouse_id: new mongoose.Types.ObjectId(),
                  count: 2
                },
                  {
                    warehouse_id: new mongoose.Types.ObjectId(),
                    count: 1
                  }],
                size: 1,
                barcode:
                  102
              },
              {
                inventory: [{
                  warehouse_id: new mongoose.Types.ObjectId(),
                  count: 1
                }
                ],
                size: 4.5,
                barcode:
                  113
              }
              ,
              {
                size: 5.5,
                barcode:
                  112
              }
            ]
          },
            {
              name: 'product three',
              product_type:
                productTypeIds[2],
              brand:
                brandIds[2],
              base_price:
                3000,
              desc:
                'some description for this product three',
              colors:
                [
                  {
                    color_id: colorIds[0],
                    images: []
                  },
                  {
                    color_id: colorIds[1],
                    images: []
                  }
                ],

              instances:
                [
                  {
                    size: 1,
                    barcode: 103
                  }
                ]
            }
          ]
        ;
        return models['ProductTest'].insertMany(productArr)
      })
      .then(res => {
        productIds = res.map(x => x._id);

        let collectionArr = [{
          //manual with products
          name: 'manual1',
          is_smart: true,
          productIds: [productIds[0]],
          tagIds: [tagIds[0]],
          typeIds: [productTypeIds[2]]
        }, {
          //manual products
          name: 'manual2 ',
          is_smart: false,
          productIds: productIds,
        }];
        return models['CollectionTest'].insertMany(collectionArr)
      })
      .then(res => {
        collectionIds = res.map(x => x._id);
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });
  it('should return collection info', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);

      expect(res.body.name).toBe('manual1');
      expect(res.body.productIds.length).toBe(1);
      expect(res.body.typeIds.length).toBe(1);
      expect(res.body.tagIds.length).toBe(1);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should return collection products', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection/products/${collectionIds[0]}`),
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('manual1');
      expect(res.body.products.length).toBe(3);
      let product2 = res.body.products.filter(x => x._id === productIds[1].toString())[0];

      productIds.forEach(id => {
        expect(res.body.products.map(x => x._id).includes(id.toString())).toBeTruthy();
      });

      expect(product2.tags.length).toBe(2);
      expect(product2.tags[0].name).toBe('tag1');
      expect(product2.tags[0].tgName).toBe('Gender');
      expect(product2.size.length).toBe(3);
      expect(product2.colors.length).toBe(1);
      expect(product2.count).toBe(4);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should return app page products', function (done) {
    this.done = done;

    let appPage = new models['PageTest']({

      address: 'testAddress',
      is_app: true,
      page_info: {
        collection_id: collectionIds[0]
      }

    });

    appPage.save()
      .then(res => {

        rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`collection/app/products`),
          body: {
            address: 'testAddress'
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        }).then(res => {
          expect(res.statusCode).toBe(200);
          expect(res.body.name).toBe('manual1');
          expect(res.body.products.length).toBe(3);
          let product2 = res.body.products.filter(x => x._id === productIds[1].toString())[0];

          productIds.forEach(id => {
            expect(res.body.products.map(x => x._id).includes(id.toString())).toBeTruthy();
          });

          expect(product2.tags.length).toBe(2);
          expect(product2.tags[0].name).toBe('tag1');
          expect(product2.tags[0].tgName).toBe('Gender');
          expect(product2.size.length).toBe(3);
          expect(product2.colors.length).toBe(1);
          expect(product2.count).toBe(4);
          done();
        }).catch(lib.helpers.errorHandler.bind(this));
      });
  });
  it('should get error when request for products of page which is not for app', function (done) {
    this.done = done;

    let appPage = new models['PageTest']({

      address: 'testAddress',
      is_app: false,
      page_info: {
        collection_id: collectionIds[0]
      }

    });

    appPage.save()
      .then(res => {

        rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`collection/app/products`),
          body: {
            address: 'testAddress'
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        }).then(res => {
          this.fail('did not failed when page is not for app');

          done();
        }).catch(err => {
          expect(err.statusCode).toBe(error.appOnly.status);
          expect(err.error).toEqual(error.appOnly.message);

          done();
        }).catch(lib.helpers.errorHandler.bind(this));
      });
  });
  it('should get error when request for products of page which is not defined', function (done) {
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`collection/app/products`),
      body: {
        address: 'testAddress'
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('did not failed when page is not for app');

      done();
    }).catch(err => {
      expect(err.statusCode).toBe(error.pageNotFound.status);
      expect(err.error).toEqual(error.pageNotFound.message);

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
  it('should get error when request for products of page which have no page info collection id', function (done) {
    this.done = done;

    let appPage = new models['PageTest']({

      address: 'testAddress',
      is_app: false,
      page_info: {
        // collection_id: collectionIds[0]
      }

    });

    appPage.save()
      .then(res => {

        rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`collection/app/products`),
          body: {
            address: 'testAddress'
          },
          jar: adminObj.jar,
          json: true,
          resolveWithFullResponse: true
        }).then(res => {
          this.fail('did not failed when page is not for app');

          done();
        }).catch(err => {
          expect(err.statusCode).toBe(error.pageInfoError.status);
          expect(err.error).toEqual(error.pageInfoError.message);

          done();
        }).catch(lib.helpers.errorHandler.bind(this));
      });
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


});
