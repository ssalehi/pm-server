const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('POST Coupon', () => {
  let product1, product2;
  let type1, type2, brand1, brand2, color1, color2, tagGroup1, tag1, tag2;
  let order1, order2;
  let campaign1, campaign2;
  const campaignId1 = new mongoose.Types.ObjectId();
  const campaignId2 = new mongoose.Types.ObjectId();
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
          orders: [orderId1, orderId2],
        });
      })
      .then(res => {
        customerObj = {
          cid: res.cid,
          jar: res.rpJar,
        };

        type1 = models()['ProductTypeTest']({
          name: 'Shoe'
        });
        type2 = models()['ProductTypeTest']({
          name: 'Shirt'
        });

        brand1 = models()['BrandTest']({
          name: 'Nike'
        });
        brand2 = models()['BrandTest']({
          name: 'Puma'
        });

        color1 = models()['ColorTest']({
          name: 'Green',
          color_id: 101
        });
        color2 = models()['ColorTest']({
          name: 'Red',
          color_id: 202
        });

        tagGroup1 = models()['TagGroupTest']({
          name: 'tag group 1',
          is_required: false,
        });

        tag1 = models()['TagTest']({
          name: 'tag 1',
          tag_group_id: tagGroup1._id,
        });
        tag2 = models()['TagTest']({
          name: 'tag 2',
          tag_group_id: tagGroup1._id,
        });


        product1 = models()['ProductTest']({
          name: 'sample name 1',
          product_type: {
            name: type1.name,
            product_type_id: type1._id
          },
          campaigns: [campaignId1, campaignId2],
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
        product2 = models()['ProductTest']({
          name: 'sample name 2',
          product_type: {
            name: type2.name,
            product_type_id: type2._id
          },
          campaigns: [campaignId2],
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

        collection1 = models()['CollectionTest']({
          name: 'collection 1',
          name_fa: 'مجموعه 1',
          productIds: [product1._id],
        });

        campaign1 = models()['CampaignTest']({
          _id: campaignId1,
          name: 'new year sales',
          discount_ref: 0.1,
          coupon_code: 'xyz',
          campaign_collection_ids: [{
            collection_id: collection1._id,
          }],
        });
        campaign2 = models()['CampaignTest']({
          _id: campaignId2,
          name: '2000 winter sales',
          discount_ref: 0.2,
          start_date: new Date(2000, 10, 10),
          end_date: new Date(2000, 11, 10),
          coupon_code: 'abcdefg',
          campaign_collection_ids: [{
            collection_id: collection1._id,
          }],
        });

        order1 = models()['OrderTest']({
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
        order2 = models()['OrderTest']({
          _id: orderId2,
          customer_id: customerObj.cid,
          transaction_id: new mongoose.Types.ObjectId(),
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

  it('should accept coupon code when not used and not expired', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        product_ids: [product1._id, product2._id],
        coupon_code: 'xyz',
      },
      uri: lib.helpers.apiTestURL('coupon/code/valid'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = res.body;
        expect(res[0].discount).toBe(0.1);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should ignore coupon code when expired', function (done) {
    rp({
      method: 'post',
      body: {
        product_ids: [product1._id, product2._id],
        coupon_code: 'abcdefg',
      },
      uri: lib.helpers.apiTestURL('coupon/code/valid'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('User can use expired coupon code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidExpiredCouponCode.status);
        expect(err.error).toBe(error.invalidExpiredCouponCode.message);
        done();
      });
  });

  it('should ignore coupon code when used', function (done) {
    models()['OrderTest'].update({
      _id: orderId1,
    }, {
      $set: {
        transaction_id: new mongoose.Types.ObjectId(),
        coupon_code: 'xyz',
      }
    }, {
      upsert: true,
    })
      .then(res => {
        return rp({
          method: 'post',
          body: {
            product_ids: [product1._id, product2._id],
            coupon_code: 'xyz',
          },
          json: true,
          uri: lib.helpers.apiTestURL('coupon/code/valid'),
          jar: customerObj.jar,
          resolveWithFullResponse: true,
        });
      })
      .then(res => {
        this.fail('User can use one coupon code again (used coupon code)');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidExpiredCouponCode.status);
        expect(err.error).toBe(error.invalidExpiredCouponCode.message);
        done();
      });
  });

  it('should get error when product_id is not declared', function (done) {
    rp({
      method: 'post',
      body: {
        coupon_code: 'xyz',
      },
      uri: lib.helpers.apiTestURL('coupon/code/valid'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('User can use coupon code without passed product_ids');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.productIdRequired.status);
        expect(err.error).toBe(error.productIdRequired.message);
        done();
      });
  });

  it('should get error when coupon_code is not declared', function (done) {
    rp({
      method: 'post',
      body: {
        product_ids: [product1._id, product2._id],
      },
      uri: lib.helpers.apiTestURL('coupon/code/valid'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('User can use coupon code without passed coupon_code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noCouponCode.status);
        expect(err.error).toBe(error.noCouponCode.message);
        done();
      });
  });

  it('should get error when user is not logged in (check coupon code validation)', function (done) {
    rp({
      method: 'post',
      body: {
        product_ids: [product1._id, product2._id],
        coupon_code: 'xyz',
      },
      uri: lib.helpers.apiTestURL('coupon/code/valid'),
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Not logged in user can use coupon code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noUser.status);
        expect(err.error).toBe(error.noUser.message);
        done();
      });
  });

  it('should set coupon code to order', function (done) {
    this.done = done;
    rp({
      method: 'post',
      body: {
        coupon_code: 'xyz',
      },
      uri: lib.helpers.apiTestURL('coupon/code/apply'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);

        return models()['OrderTest'].findOne({_id: orderId1}).lean();
      })
      .then(res => {
        expect(res.coupon_code).toBe('xyz');
        expect(res.transaction_id).toBeUndefined();
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when use not logged in (apply coupon code)', function (done) {
    rp({
      method: 'post',
      body: {
        coupon_code: 'xyz',
      },
      uri: lib.helpers.apiTestURL('coupon/code/apply'),
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Not logged in user can use coupon code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noUser.status);
        expect(err.error).toBe(error.noUser.message);
        done();
      });
  });

  it('should get error when coupon_code is not declared', function (done) {
    rp({
      method: 'post',
      body: {
      },
      uri: lib.helpers.apiTestURL('coupon/code/apply'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('User can set coupon code without passing coupon_code');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noCouponCode.status);
        expect(err.error).toBe(error.noCouponCode.message);
        done();
      });
  });
});