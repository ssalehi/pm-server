const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

xdescribe('POST Order', () => {

  let adminObj = {
    aid: null,
    jar: null
  };

  let customerIds = [];
  let customerArr = [{
    first_name: 'a',
    surname: 'b',
    username: 'un1',
    is_verified: true,
    balance: 20,
    loyalty_points: 10,
  }, {
    first_name: 'c',
    surname: 'd',
    username: 'un2',
    is_verified: true,
    balance: 100,
    loyalty_points: 0,
  }];

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let productArr = [{
    name: 'sample name',
    product_type: mongoose.Types.ObjectId(),
    brand: mongoose.Types.ObjectId(),
    base_price: 30000,
    desc: 'some description for this product',
    instances: [
      {
        inventory: [],
        _id: productInstanceIds[0],
        product_color_id: mongoose.Types.ObjectId(),
        size: "9",
        price: 20,
        barcode: "091201406845"
      },
      {
        inventory: [],
        _id: productInstanceIds[1],
        product_color_id: mongoose.Types.ObjectId(),
        size: "10",
        price: 30,
        barcode: "091201407132"
      }
    ]
  }, {
    name: 'soomple num',
    product_type: mongoose.Types.ObjectId(),
    brand: mongoose.Types.ObjectId(),
    base_price: 40000,
    desc: 'again some more description for another product',
    instances: [
      {
        inventory: [],
        _id: productInstanceIds[2],
        product_color_id: mongoose.Types.ObjectId(),
        size: 20,
        price: 400000,
        barcode: "02940291039"
      }
    ]
  }];
  let existingOrderId;
  let existingOrderForSecondCustomer;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => lib.dbHelpers.addAndLoginAgent('admin'))
      .then(res => {
        adminObj.aid = res.aid;
        adminObj.jar = res.rpJar;

        return models['CustomerTest'].insertMany(customerArr);
      })
      .then(res => {
        customerIds = res.map(x => x._id);

        existingOrderForSecondCustomer = {
          customer_id: customerIds[1],
          total_amount: 0,
          order_time: new Date(),
          is_cart: true,
          order_line_ids: [{
            product_instance_id: productInstanceIds[0]
          }]
        };

        return models['OrderTest'].insertMany([existingOrderForSecondCustomer]);
      })
      .then(res => {
        existingOrderId = res[0]._id;

        return models['ProductTest'].insertMany(productArr);
      })
      .then(res => {
        productIds = res.map(x => x._id);

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
        customer_id: mongoose.Types.ObjectId(),
        product_instance_id: productInstanceIds[0]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .catch(res => {
        expect(res.statusCode).toBe(500);
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
        customer_id: customerIds[0],
        product_instance_id: productInstanceIds[0]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[0]);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_line_ids.length).toBe(1);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);

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
        customer_id: customerIds[0],
        product_instance_id: productInstanceIds[0],
        number: 4,
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({_id: res.body.upserted[0]._id}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[0]);
        expect(res[0].is_cart).toBe(true);
        expect(res[0].order_line_ids.length).toBe(4);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[2].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[3].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add new orderline to an existing order (for second customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[2]
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[1]);
        expect(res[0].order_line_ids.length).toBe(2);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[2]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should add multiple orderlines to an existing order (for second customer)', function (done) {
    this.done = done;

    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL('order'),
      body: {
        customer_id: customerIds[1],
        product_instance_id: productInstanceIds[2],
        number: 3,
      },
      jar: adminObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].find({}).lean();
      })
      .then(res => {
        expect(res.length).toEqual(1);
        expect(res[0].customer_id).toEqual(customerIds[1]);
        expect(res[0].order_line_ids.length).toBe(4);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_line_ids[2].product_instance_id).toEqual(productInstanceIds[2]);
        expect(res[0].order_line_ids[3].product_instance_id).toEqual(productInstanceIds[2]);

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
              name:  color1.name,
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
          order_line_ids: [{
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
          order_line_ids: [{
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