const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');
const _const = require('../../../lib/const.list');

describe('POST Order (New Order)', () => {

  let customerObj = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let type1, brand1;
  let productArr = [];
  let existingOrderId;
  let existingOrderForSecondCustomer;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('a@a', '123456', {
        first_name: 'iman',
        surname: 'toufighi',
      }))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        type1 = models['ProductTypeTest']({
          name: 'myType'
        });
        brand1 = models['BrandTest']({
          name: 'Nike'
        });

        return Promise.all([type1.save(), brand1.save()]);
      })
      .then(res => {
        productArr.push(models['ProductTest']({
          _id: productIds[0],
          name: 'sample name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id
          },
          base_price: 30000,
          desc: 'some description for this product',
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: mongoose.Types.ObjectId(),
              size: "9",
              price: 2000,
              barcode: '0394081341'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: mongoose.Types.ObjectId(),
              size: "10",
              price: 4000,
              barcode: '19231213123'
            }
          ]
        }));
        productArr.push(models['ProductTest']({
          _id: productIds[1],
          name: 'another simple name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 600000,
          desc: "some else description for this product",
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: mongoose.Types.ObjectId(),
              size: "11",
              price: 50000,
              barcode: '9303850203',
            }
          ]
        }));

        return Promise.all([productArr[0].save(), productArr[1].save()]);
      })
      .then(res => {

        existingOrderForSecondCustomer = {
          customer_id: mongoose.Types.ObjectId(),
          total_amount: 0,
          order_time: new Date(),
          is_cart: true,
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0]
          }]
        };

        return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
      })
      .then(res => {
        existingOrderId = res[0]._id;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('should not do anything because no customer with such customer_id exists', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0]
      },
      json: true,
      resolveWithFullResponse: true
    })
      .catch(res => {
        expect(res.statusCode).toBe(404);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should create an orderline and add it to a new order (for first customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0]
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_lines.length).toBe(1);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add multiple orderlines and add them to a new order (for first customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        number: 4,
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_lines.length).toBe(4);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[1].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[2].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[3].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[1].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[2].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[3].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});

describe('POST Order (Already-exist Order)', () => {

  let customerObj = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let type1, brand1;
  let productArr = [];
  let existingOrderId;
  let existingOrderForSecondCustomer;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('a@a', '123456', {
        first_name: 'iman',
        surname: 'toufighi',
      }))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        type1 = models['ProductTypeTest']({
          name: 'myType'
        });
        brand1 = models['BrandTest']({
          name: 'Nike'
        });

        return Promise.all([type1.save(), brand1.save()]);
      })
      .then(res => {
        productArr.push(models['ProductTest']({
          _id: productIds[0],
          name: 'sample name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id
          },
          base_price: 30000,
          desc: 'some description for this product',
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: mongoose.Types.ObjectId(),
              size: "9",
              price: 2000,
              barcode: '0394081341'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: mongoose.Types.ObjectId(),
              size: "10",
              price: 4000,
              barcode: '19231213123'
            }
          ]
        }));
        productArr.push(models['ProductTest']({
          _id: productIds[1],
          name: 'another simple name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 600000,
          desc: "some else description for this product",
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: mongoose.Types.ObjectId(),
              size: "11",
              price: 50000,
              barcode: '9303850203',
            }
          ]
        }));

        return Promise.all([productArr[0].save(), productArr[1].save()]);
      })
      .then(res => {

        existingOrderForSecondCustomer = {
          customer_id: customerObj.cid,
          total_amount: 0,
          order_time: new Date(),
          is_cart: true,
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0]
          }]
        };

        return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
      })
      .then(res => {
        existingOrderId = res[0]._id;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('should add new orderline to an existing order', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        product_id: productIds[1],
        product_instance_id: productInstanceIds[2]
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_lines.length).toBe(2);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[1].product_id).toEqual(productIds[1]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[1].product_instance_id).toEqual(productInstanceIds[2]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add multiple orderlines to an existing order', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        product_id: productIds[1],
        product_instance_id: productInstanceIds[2],
        number: 3,
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_lines.length).toBe(4);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[1].product_id).toEqual(productIds[1]);
        expect(res[0].order_lines[2].product_id).toEqual(productIds[1]);
        expect(res[0].order_lines[3].product_id).toEqual(productIds[1]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[1].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_lines[2].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_lines[3].product_instance_id).toEqual(productInstanceIds[2]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

describe('POST Order (Fetch cart details)', () => {
  let product1, product2;
  let type1, type2, brand1, brand2, color1, color2, tagGroup1, tag1, tag2;
  let order1, order2;
  let campaign1, campaign2;
  let collection1;

  let customerObj = {
    cid: null,
    jar: null,
  };

  const orderId1 = new mongoose.Types.ObjectId();
  const orderId2 = new mongoose.Types.ObjectId();

  const colorId1 = new mongoose.Types.ObjectId();
  const colorId2 = new mongoose.Types.ObjectId();

  const instanceId1 = new mongoose.Types.ObjectId();
  const instanceId2 = new mongoose.Types.ObjectId();
  const instanceId3 = new mongoose.Types.ObjectId();
  const instanceId4 = new mongoose.Types.ObjectId();
  const instanceId5 = new mongoose.Types.ObjectId();
  const instanceId6 = new mongoose.Types.ObjectId();

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return lib.dbHelpers.addAndLoginCustomer('a@a', '123456', {
          first_name: 'Ali',
          surname: 'Alavi',
          orders: [orderId1],
        });
      })
      .then(res => {
        customerObj = {
          cid: res.cid,
          jar: res.rpJar,
        };

        type1 = models['ProductTypeTest']({
          name: 'Shoe'
        });
        type2 = models['ProductTypeTest']({
          name: 'Shirt'
        });

        brand1 = models['BrandTest']({
          name: 'Nike'
        });
        brand2 = models['BrandTest']({
          name: 'Puma'
        });

        color1 = models['ColorTest']({
          name: 'Green',
          color_id: 101
        });
        color2 = models['ColorTest']({
          name: 'Red',
          color_id: 202
        });

        tagGroup1 = models['TagGroupTest']({
          name: 'tag group 1',
          is_required: false,
        });

        tag1 = models['TagTest']({
          name: 'tag 1',
          tag_group_id: tagGroup1._id,
        });
        tag2 = models['TagTest']({
          name: 'tag 2',
          tag_group_id: tagGroup1._id,
        });

        product1 = models['ProductTest']({
          name: 'sample name 1',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              _id: colorId1,
              color_id: color1._id,
              name: color1.name,
              code: color1.color_id,
              image: {
                thumbnail: 'one thumbnail',
                angels: ['some url 11', 'some url 12']
              }
            },
            {
              _id: colorId2,
              color_id: color2._id,
              name: color2.name,
              code: color2.color_id,
              image: {
                thumbnail: 'another thumbnail',
                angels: ['some url 21', 'some url 22', 'some url 23']
              }
            }
          ],
          instances: [
            {
              _id: instanceId1,
              product_color_id: colorId1,
              size: '12',
              price: 123,
              barcode: '123456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 2,
              }]
            },
            {
              _id: instanceId2,
              product_color_id: colorId1,
              size: '8',
              barcode: '123456780',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 3,
              }]
            },
            {
              _id: instanceId3,
              product_color_id: colorId1,
              size: '15',
              barcode: '123456700',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491efa',
                count: 0,
              }, {
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 1,
              }]
            },
            {
              _id: instanceId4,
              product_color_id: colorId2,
              size: '12',
              price: '123',
              barcode: '123456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 2,
              }]
            }
          ],
          tags: [{
            name: tag1.name,
            tg_name: tagGroup1.name,
            tag_id: tag1._id
          }, {
            name: tag2.name,
            tg_name: tagGroup1.name,
            tag_id: tag2._id
          }]
        });
        product2 = models['ProductTest']({
          name: 'sample name 2',
          product_type: {
            name: type2.name,
            product_type_id: type2._id
          },
          brand: {
            name: brand2.name,
            brand_id: brand2._id
          },
          base_price: 50000,
          desc: 'some description for this product',
          instances: [
            {
              _id: instanceId5,
              product_color_id: colorId2,
              size: '12',
              barcode: '513456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 2,
              }]
            },
            {
              _id: instanceId6,
              product_color_id: colorId1,
              size: '14',
              barcode: '523456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 0,
              }]
            }
          ]
        });

        collection1 = models['CollectionTest']({
          name: 'collection 1',
          name_fa: 'مجموعه 1',
          productIds: [product1._id],
        });

        campaign1 = models['CampaignTest']({
          name: 'new year sales',
          discount_ref: 10,
          campaign_collection_ids: [{
            collection_id: collection1._id,
          }],
        });
        campaign2 = models['CampaignTest']({
          name: '2000 winter sales',
          discount_ref: 20,
          start_date: new Date(2000, 10, 10),
          end_date: new Date(2000, 11, 10),
          campaign_collection_ids: [{
            discount_diff: 3,
            collection_id: collection1._id,
          }],
        });

        order1 = models['OrderTest']({
          is_cart: true,
          _id: orderId1,
          customer_id: customerObj.cid,
          order_time: new Date(),
          order_lines: [{
            product_instance_id: instanceId1,
            product_id: product1._id,
            adding_time: new Date(),
            campaign_id: campaign1._id,
          }, {
            product_instance_id: instanceId5,
            product_id: product2._id,
            adding_time: new Date(),
          }, {
            product_instance_id: instanceId4,
            product_id: product1._id,
            adding_time: new Date(2000, 10, 20),
            campaign_id: campaign2._id,
          }, {
            product_instance_id: instanceId2,
            product_id: product1._id,
          }, {
            product_instance_id: instanceId1,
            product_id: product1._id,
            adding_time: new Date(),
          }]
        });
        order2 = models['OrderTest']({
          _id: orderId2,
          customer_id: customerObj.cid,
          order_time: new Date(),
          order_lines: [{
            product_instance_id: instanceId5,
            product_id: product2._id,
            adding_time: new Date(),
          }, {
            product_instance_id: instanceId4,
            product_id: product1._id,
            adding_time: new Date(),
          }, {
            product_instance_id: instanceId3,
            product_id: product1._id,
            adding_time: new Date(),
          }, {
            product_instance_id: instanceId4,
            product_id: product1._id,
            adding_time: new Date(),
          }]
        });

        return Promise.all([
          type1.save(),
          type2.save(),
          brand1.save(),
          brand2.save(),
          color1.save(),
          color2.save(),
          tagGroup1.save(),
          tag1.save(),
          tag2.save(),
          product1.save(),
          product2.save(),
          collection1.save(),
          campaign1.save(),
          campaign2.save(),
          order1.save(),
          order2.save()
        ]);
      })
      .then(() => {
        done();
      })
      .catch(err => {
        console.error('Error in beforeEach: ', err);
        done();
      })
  });

  it("should get non-checkout order lines for logged in customer", function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        data: {},
      },
      json: true,
      uri: lib.helpers.apiTestURL('cart/items'),
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = res.body;
        expect(res.length).toBe(4);
        expect(res.map(el => el.quantity)).toContain(2);
        res = res[0];
        expect(res.instance_id).toBeDefined();
        expect(res.product_id).toBeDefined();
        expect(res.color).toBeDefined();
        expect(res.size).toBeDefined();
        expect(res.quantity).toBeDefined();
        expect(res.base_price).toBeDefined();
        expect(res.tags).toBeDefined();
        expect(res.thumbnail).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get order items (lines) data for not logged in customer", function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        data: [
          {
            product_id: product1._id,
            instance_id: instanceId4
          },
          {
            product_id: product1._id,
            instance_id: instanceId1
          },
        ],
      },
      json: true,
      uri: lib.helpers.apiTestURL('cart/items'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = res.body;
        expect(res.length).toBe(2);
        res = res[0];

        expect(res.instance_id).toBeDefined();
        expect(res.product_id).toBeDefined();
        expect(res.color).toBeDefined();
        expect(res.size).toBeDefined();
        expect(res.quantity).toBeDefined();
        expect(res.base_price).toBeDefined();
        expect(res.tags).toBeDefined();
        expect(res.thumbnail).toBeDefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get error when customer is not logged in and instance_ids is not declared", function (done) {
    rp({
      method: 'post',
      body: {
        d: {}
      },
      json: true,
      uri: lib.helpers.apiTestURL('cart/items'),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Not logged in customer can get cart items without declared instance_ids');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.instanceDataRequired.status);
        expect(err.error).toBe(error.instanceDataRequired.message);
        done();
      });
  });
});

describe('POST Order (Delete Order lines)', () => {

  let customerObj = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ];
  let productIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let type1, brand1;
  let productArr = [];
  let existingOrderId;
  let existingOrderForSecondCustomer;


  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginCustomer('a@a', '123456', {
        first_name: "iman",
        surname: 'surname',
      }))
      .then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;

        type1 = models['ProductTypeTest']({
          name: 'type1',
        });
        brand1 = models['BrandTest']({
          name: 'Nike',
        });

        return Promise.all([type1.save(), brand1.save()]);
      })
      .then(res => {
        productArr.push(models['ProductTest']({
          _id: productIds[0],
          name: 'sample name',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 30000,
          desc: 'some description for this product',
          instances: [
            {
              inventory: [],
              _id: productInstanceIds[0],
              product_color_id: mongoose.Types.ObjectId(),
              size: "9",
              price: 2000,
              barcode: '984749202',
            },
            {
              inventory: [],
              _id: productInstanceIds[1],
              product_color_id: mongoose.Types.ObjectId(),
              size: "10",
              price: 3000,
              barcode: '928383010'
            },
            {
              inventory: [],
              _id: productInstanceIds[2],
              product_color_id: mongoose.Types.ObjectId(),
              size: "11",
              price: 70000,
              barcode: '393038202'
            }
          ]
        }));
        productArr.push(models['ProductTest']({
          _id: productIds[1],
          name: "another simple name",
          product_type: {
            name: type1.name,
            product_type_id: type1._id,
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id,
          },
          base_price: 60000,
          desc: 'another else description for this product',
          instances: [
            {
              _id: productInstanceIds[3],
              product_color_id: mongoose.Types.ObjectId(),
              size: '11',
              price: 50000,
              barcode: '949302838',
            },
          ]
        }));

        return Promise.all([productArr[0].save(), productArr[1].save()]);
      })
      .then(res => {

        existingOrderForSecondCustomer = {
          customer_id: customerObj.cid,
          total_amount: 0,
          order_time: new Date(),
          is_cart: true,
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
          }, {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1]
          }]
        };

        return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
      })
      .then(res => {
        existingOrderId = res[0]._id;

        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  it('should remove all orderlines of an instance from an existing order', function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order/delete'),
      body: {
        product_instance_id: productInstanceIds[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_lines.length).toBe(1);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[1]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should remove 2 orderlines of an instance from an existing order', function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order/delete'),
      body: {
        product_instance_id: productInstanceIds[0],
        number: 2
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_lines.length).toBe(2);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[1].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[1].product_instance_id).toEqual(productInstanceIds[1]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should remove the only orderline of an instance while we give it a number of 2 from an existing order', function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order/delete'),
      body: {
        product_instance_id: productInstanceIds[1],
        number: 2
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean()
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].order_lines.length).toBe(3);
        expect(res[0].order_lines[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[1].product_id).toEqual(productIds[0]);
        expect(res[0].order_lines[0].product_instance_id.equals(productInstanceIds[0])).toBe(true);
        expect(res[0].order_lines[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_lines[1].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});
