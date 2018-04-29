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
            instance_id: instanceId4,
            quantity: 3
          },
          {
            product_id: product1._id,
            instance_id: instanceId1,
            quantity: 3
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

describe('POST Order - (Set Ticket)', () => {

  let SMAgent = {
    cid: null,
    jar: null
  };
  let SCAgent = {
    cid: null,
    jar: null
  };

  let productInstanceIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let colorIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()
  ];
  let productIds = [];
  let warehouses = [
    {
      _id: mongoose.Types.ObjectId(),
      name: 'انبار مرکزی',
      phone: 'نا مشخص',
      address: {
        city: 'تهران',
        street: 'نامشخص',
        province: 'تهران'
      },
      is_center: true,
      priority: 0,

    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'پالادیوم',
      phone: ' 021 2201 0600',
      has_customer_pickup: true,
      address: {
        city: 'تهران',
        street: 'مقدس اردبیلی',
        province: 'تهران'
      },
      priority: 1,

    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'سانا',
      phone: '021 7443 8111',
      has_customer_pickup: true,
      address: {
        province: 'تهران',
        city: 'تهران',
        street: 'اندرزگو',
      },
      priority: 2,
    },
    {
      _id: mongoose.Types.ObjectId(),
      name: 'ایران مال',
      phone: 'نا مشخص',
      has_customer_pickup: true,
      address: {
        province: 'تهران',
        city: 'تهران',
        street: 'اتوبان خرازی',
      },
      priority: 3,
    }
  ];

  let orders = [];
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(() => {
        return models['WarehouseTest'].insertMany(warehouses)
      })
      .then(() => {
        return lib.dbHelpers.addAndLoginAgent('sm', _const.ACCESS_LEVEL.SalesManager, warehouses.find(x => x.is_center)._id)
      })
      .then(res => {
        SMAgent.aid = res.aid;
        SMAgent.jar = res.rpJar;
        return lib.dbHelpers.addAndLoginAgent('sc', _const.ACCESS_LEVEL.ShopClerk, warehouses.find(x => x.name === 'سانا')._id)
      })
      .then(res => {
        SCAgent.aid = res.aid;
        SCAgent.jar = res.rpJar;
        let products = [{
          _id: productIds[0],
          name: 'sample 1',
          product_type: {
            name: 'sample type',
            product_type_id: mongoose.Types.ObjectId()
          },
          brand: {
            name: 'sample brand',
            brand_id: mongoose.Types.ObjectId()
          },
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: colorIds[0],
              name: 'green'
            },
            {
              color_id: colorIds[1],
              name: 'yellow'
            },
            {
              color_id: colorIds[2],
              name: 'red'
            }
          ],
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: colorIds[0],
              size: "9",
              price: 2000,
              barcode: '0394081341',
            },
            {
              _id: productInstanceIds[1],
              product_color_id: colorIds[1],
              size: "10",
              price: 4000,
              barcode: '19231213123',
            }
          ]
        },
          {
            _id: productIds[1],
            name: 'simple 2',
            product_type: {
              name: 'sample type',
              product_type_id: mongoose.Types.ObjectId()
            },
            brand: {
              name: 'sample brand',
              brand_id: mongoose.Types.ObjectId()
            },
            base_price: 600000,
            desc: "some else description for this product",
            colors: [
              {
                color_id: colorIds[2],
                name: 'red'
              }, {
                color_id: colorIds[3],
                name: 'purple'
              },
            ],
            instances: [
              {
                _id: productInstanceIds[2],
                product_color_id: colorIds[2],
                size: "11",
                price: 50000,
                barcode: '9303850203',
                tickets: [
                  {}
                ],
                inventory : [
                  {
                    warehouse_id : warehouses.find(x => x.name === 'سانا')._id,
                    count : 2,
                    reserved: 1
                  }
                ],
              },
              {
                _id: productInstanceIds[3],
                product_color_id: colorIds[3],
                size: "11",
                price: 50000,
                barcode: '9303850203',

              }
            ]
          }];
        return models['ProductTest'].insertMany(products);
      })
      .then(res => {

        productIds = res.map(x => x._id);

        let _orders = [{
          customer_id: mongoose.Types.ObjectId(),
          total_amount: 3,
          order_time: new Date(),
          is_cart: false,
          address: {
            _id: mongoose.Types.ObjectId(),
            province: 'تهران',
            city: 'تهران',
            street: 'نامشخص'
          },
          transaction_id: mongoose.Types.ObjectId(),
          order_lines: [{
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default
              }
            ]
          }, { // shop clerk ticket
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            tickets: [
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default,
                is_processed: true,
                agent_id: SMAgent.aid
              },
              {
                warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
                referral_advice: _const.REFERRAL_ADVICE.SendToCustomer
              }
            ]
          }, { // sales manager ticket
            product_id: productIds[1],
            product_instance_id: productInstanceIds[2],
            tickets: [ // sales manager ticket
              {
                warehouse_id: warehouses.find(x => x.is_center)._id,
                status: _const.ORDER_STATUS.default,
                is_processed: true,
                agent_id: SMAgent.aid
              },
              {
                warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
                referral_advice: _const.REFERRAL_ADVICE.SendToCentral,
                is_processed: true,
                agent_id: SCAgent.aid
              }, {
                warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
                status: _const.ORDER_STATUS.Invoice,
              }
            ]
          }]
        }];

        return models['OrderTest'].insertMany(_orders);
      })
      .then(res => {
        orders = res;
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      })
  });

  // refer tickets
  it('sales manager should be able to set refer ticket for a c&c order and send to shop clerk ', function (done) {
    this.done = done;

    let cANDcOrder = new models['OrderTest']({ // C&C order
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 2,
      order_time: new Date(),
      is_cart: false,
      address: warehouses.find(x => x.name === 'سانا').address,
      transaction_id: mongoose.Types.ObjectId(),
      is_collect: true,
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default
          }
        ]
      }]
    });
    cANDcOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/refer`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
            warehouseId: warehouses.find(x => x.name === 'سانا')._id
          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        }).then(res => {
          expect(res.statusCode).toBe(200);
          expect(res.body.n).toBe(1);
          expect(res.body.nModified).toBe(1);
          return models['OrderTest'].findById(cANDcOrder._id).lean()

        })
          .then(res => {
            expect(res.order_lines[0].tickets.length).toBe(2);
            expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
            expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SMAgent.aid.toString());
            expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.SMAssignToWarehouse);
            expect(res.order_lines[0].tickets[1].warehouse_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString());

            done();

          })
          .catch(lib.helpers.errorHandler.bind(this));
      });

  });
  it('sales manager should be able to set refer ticket with referral advice for a non c&c order and send to shop clerk', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/refer`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
        referralAdvice: _const.REFERRAL_ADVICE.SendToCentral,
        warehouseId: warehouses.find(x => x.name === 'سانا')._id
      },
      json: true,
      jar: SMAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      expect(res.body.nModified).toBe(1);
      return models['OrderTest'].findById(orders[0]._id).lean()
    })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(2);
        expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
        expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SMAgent.aid.toString());
        expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.SMAssignToWarehouse);
        expect(res.order_lines[0].tickets[1].referral_advice).toBe(_const.REFERRAL_ADVICE.SendToCentral);
        expect(res.order_lines[0].tickets[1].warehouse_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('nobody except sales manager should not be able to make a refer ticket', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/refer`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
        referralAdvice: _const.REFERRAL_ADVICE.SendToCentral,
        warehouseId: warehouses.find(x => x.name === 'سانا')._id
      },
      json: true,
      jar: SCAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('shop clerk can make a refer ticket');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
  it('sales manager should not be able to make a refer ticket with referral advice for a c&c order', function (done) {
    this.done = done;
    let cANDcOrder = new models['OrderTest']({ // C&C order
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 2,
      order_time: new Date(),
      is_cart: false,
      address: warehouses.find(x => x.name === 'سانا').address,
      transaction_id: mongoose.Types.ObjectId(),
      is_collect: true,
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default
          }
        ]
      }]
    });
    cANDcOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/refer`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
            referralAdvice: _const.REFERRAL_ADVICE.SendToCentral,
            warehouseId: warehouses.find(x => x.name === 'سانا')._id
          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('sales manager can set a refer ticket with referral advice for a c&c order');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.activeTicketNotFound.status);
        expect(err.error).toBe(error.activeTicketNotFound.message);
        done();
      });
  });
  it('sales manager should not be able to change warehouse id for a c&c order', function (done) {
    this.done = done;
    let cANDcOrder = new models['OrderTest']({ // C&C order
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 2,
      order_time: new Date(),
      is_cart: false,
      address: warehouses.find(x => x.name === 'سانا').address,
      transaction_id: mongoose.Types.ObjectId(),
      is_collect: true,
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default
          }
        ]
      }]
    });
    cANDcOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/refer`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
            warehouseId: warehouses.find(x => x.name === 'پالادیوم')._id

          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.n).toBe(1);
        expect(res.body.nModified).toBe(1);
        return models['OrderTest'].findById(cANDcOrder._id).lean()
      })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(2);
        expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
        expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SMAgent.aid.toString());
        expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.SMAssignToWarehouse);
        expect(res.order_lines[0].tickets[1].warehouse_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('sales manager should not be able to make duplicate refer ticket', function (done) {
    this.done = done;
    let newOrder = new models['OrderTest']({
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 3,
      order_time: new Date(),
      is_cart: false,
      address: {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'نامشخص'
      },
      transaction_id: mongoose.Types.ObjectId(),
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default,
            is_processed: true,
            agent_id: SMAgent.aid
          },
          {
            warehouse_id: warehouses.find(x => x.name === 'سانا')._id,
            status: _const.ORDER_STATUS.SMAssignToWarehouse
          }
        ]
      }]
    });
    newOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/refer`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
            warehouseId: warehouses.find(x => x.name === 'پالادیوم')._id

          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('sales manager can make duplicate refer ticket');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.existingActiveTicket.status);
        expect(err.error).toBe(error.existingActiveTicket.message);
        done();
      });
  });

  // invoice tickets
  it('sales manager should be able to set invoice ticket for a non c&c order', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/invoice`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
      },
      json: true,
      jar: SMAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      expect(res.body.nModified).toBe(1);
      return models['OrderTest'].findById(orders[0]._id).lean()
    })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(2);
        expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
        expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SMAgent.aid.toString());
        expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.Invoice);
        expect(res.order_lines[0].tickets[1].warehouse_id.toString()).toBe(warehouses.find(x => x.is_center)._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('shop clerk should be able to set invoice ticket for order and set the logined warehouse id', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/invoice`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
      },
      json: true,
      jar: SCAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      expect(res.body.nModified).toBe(1);
      return models['OrderTest'].findById(orders[0]._id).lean()
    })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(2);
        expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
        expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SCAgent.aid.toString());
        expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.Invoice);
        expect(res.order_lines[0].tickets[1].warehouse_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString());

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('sales manager should not be able to make a invoice ticket for a c&c order', function (done) {
    this.done = done;
    let cANDcOrder = new models['OrderTest']({ // C&C order
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 2,
      order_time: new Date(),
      is_cart: false,
      address: warehouses.find(x => x.name === 'سانا').address,
      transaction_id: mongoose.Types.ObjectId(),
      is_collect: true,
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default
          }
        ]
      }]
    });
    cANDcOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/invoice`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('sales manager can set a invoice ticket for a c&c order');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
  it('sales manager should be able to request for invoice for second time', function (done) {
    this.done = done;
    let newOrder = new models['OrderTest']({
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 3,
      order_time: new Date(),
      is_cart: false,
      address: {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'نامشخص'
      },
      transaction_id: mongoose.Types.ObjectId(),
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default,
            is_processed: true,
            agent_id: SMAgent.aid
          },
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.Invoice
          }
        ]
      }]
    });
    newOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/offline/requestInvoice`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        }).then(res => {
          expect(res.statusCode).toBe(200);
          expect(res.body.result).toBe('ok');
          done();
        })
          .catch(lib.helpers.errorHandler.bind(this));
      });
  });
  it('sales manager should not be able to request for invoice for second time when previous active invoice ticket is not exists', function (done) {
    this.done = done;
    let newOrder = new models['OrderTest']({
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 3,
      order_time: new Date(),
      is_cart: false,
      address: {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'نامشخص'
      },
      transaction_id: mongoose.Types.ObjectId(),
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default,
            is_processed: true,
            agent_id: SMAgent.aid
          }
        ]
      }]
    });
    newOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/offline/requestInvoice`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        }).then(res => {
          this.fail('sales manage can request for invoice for second time when previous active invoice ticket is not exists');
          done();
        })
          .catch(err => {
            expect(err.statusCode).toBe(error.preInvoiceTicketIsNotExists.status);
            expect(err.error).toBe(error.preInvoiceTicketIsNotExists.message);
            done();
          });
      });
  });


  // refund tickets
  it('sales manager should be able to set refund ticket for any order ', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/refund`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
      },
      json: true,
      jar: SMAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.n).toBe(1);
      expect(res.body.nModified).toBe(1);
      return models['OrderTest'].findById(orders[0]._id).lean()
    })
      .then(res => {
        expect(res.order_lines[0].tickets.length).toBe(2);
        expect(res.order_lines[0].tickets[0].is_processed).toBeTruthy();
        expect(res.order_lines[0].tickets[0].agent_id.toString()).toBe(SMAgent.aid.toString());
        expect(res.order_lines[0].tickets[1].status).toBe(_const.ORDER_STATUS.SMRefund);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('nobody except sales manager should not be able to make a refer ticket', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`order/ticket/refund`),
      body: {
        orderId: orders[0]._id,
        orderLineId: orders[0].order_lines[0]._id,
      },
      json: true,
      jar: SCAgent.jar,
      resolveWithFullResponse: true
    }).then(res => {
      this.fail('shop clerk can make a refund ticket');
      done();
    })
      .catch(err => {
        expect(err.statusCode).toBe(error.noAccess.status);
        expect(err.error).toBe(error.noAccess.message);
        done();
      });
  });
  it('sales manager should not be able to make duplicate refund ticket', function (done) {
    this.done = done;
    let newOrder = new models['OrderTest']({
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 3,
      order_time: new Date(),
      is_cart: false,
      address: {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'نامشخص'
      },
      transaction_id: mongoose.Types.ObjectId(),
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default,
            is_processed: true,
            agent_id: SMAgent.aid
          },
          {
            status: _const.ORDER_STATUS.SMRefund
          }
        ]
      }]
    });
    newOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/refund`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,

          },
          json: true,
          jar: SMAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('sales manager can make duplicate refer ticket');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.existingActiveTicket.status);
        expect(err.error).toBe(error.existingActiveTicket.message);
        done();
      });
  });

  // verify invoice tickets
  it('offline system should be able to call verify invoice api', function (done) {
    this.done = done;

    let order;
    new models['CustomerTest']({
      _id: orders[0].customer_id,
      username: 'test@test',
      password: '1234556',
      mobile_no: '09125975886',
      first_name: 'test',
      surname: 'test'
    }).save()
      .then(res =>
        rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/verifyInvoice`),
          body: {
            orderId: orders[0]._id,
            orderLineId: orders[0].order_lines[2]._id,
            warehouseId: warehouses.find(x => x.name === 'سانا')._id,
            userId: SCAgent.aid,
            mobileNo: "09125975886",
            point: 100,
            balance: 6500
          },
          json: true,
          jar: SCAgent.jar,
          resolveWithFullResponse: true
        }))
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['OrderTest'].findById(orders[0]._id).lean()
      })
      .then(res => {
        order = res;
        expect(res.order_lines[2].tickets.length).toBe(4);
        expect(res.order_lines[2].tickets[2].is_processed).toBeTruthy();
        expect(res.order_lines[2].tickets[2].agent_id.toString()).toBe(SCAgent.aid.toString());
        expect(res.order_lines[2].tickets[3].status).toBe(_const.ORDER_STATUS.ReadyToDeliver);
        expect(res.order_lines[2].tickets[3].warehouse_id.toString()).toBe(warehouses.find(x => x.name === 'سانا')._id.toString());

        return models['CustomerTest'].findById(res.customer_id).lean();

      })
      .then(res => {

        expect(res.loyalty_points).toBe(100);
        expect(res.balance).toBe(6500);

        return models['ProductTest'].findById(order.order_lines[2].product_id)

      })
      .then(res => {

        let foundInstance = res.instances.find(x => x._id.toString() === order.order_lines[2].product_instance_id.toString());

        let foundInventory  = foundInstance.inventory.find(x => x.warehouse_id.toString() === warehouses.find(x => x.name === 'سانا')._id.toString());

        expect(foundInventory.count).toBe(1);
        expect(foundInventory.reserved).toBe(0);

        done()

      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it('offline system should not be able to make duplicate verify invoice ticket', function (done) {
    this.done = done;
    let newOrder = new models['OrderTest']({
      customer_id: mongoose.Types.ObjectId(),
      total_amount: 3,
      order_time: new Date(),
      is_cart: false,
      address: {
        _id: mongoose.Types.ObjectId(),
        province: 'تهران',
        city: 'تهران',
        street: 'نامشخص'
      },
      transaction_id: mongoose.Types.ObjectId(),
      order_lines: [{
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        tickets: [ // sales manager ticket
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.default,
            is_processed: true,
            agent_id: SMAgent.aid
          },
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.Invoice,
            is_processed: true,
            agent_id: SMAgent.aid
          },
          {
            warehouse_id: warehouses.find(x => x.is_center)._id,
            status: _const.ORDER_STATUS.ReadyToDeliver,
          },
        ]
      }]
    });
    newOrder.save()
      .then(res => {
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL(`order/ticket/verifyInvoice`),
          body: {
            orderId: res._id,
            orderLineId: res.order_lines[0]._id,
            warehouseId: warehouses.find(x => x.name === 'سانا')._id,
            userId: SCAgent.aid
          },
          json: true,
          jar: SCAgent.jar,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('offline system can make duplicate verify invoice ticket');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.existingActiveTicket.status);
        expect(err.error).toBe(error.existingActiveTicket.message);
        done();
      });
  });

});
