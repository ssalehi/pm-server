const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe('DELETE Order', () => {

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
          order_line_ids: [{
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
        expect(res[0].order_line_ids.length).toBe(1);
        expect(res[0].order_line_ids[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[1]);

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
        expect(res[0].order_line_ids.length).toBe(2);
        expect(res[0].order_line_ids[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_line_ids[1].product_id).toEqual(productIds[0]);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[1]);

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
        expect(res[0].order_line_ids.length).toBe(3);
        expect(res[0].order_line_ids[0].product_id).toEqual(productIds[0]);
        expect(res[0].order_line_ids[1].product_id).toEqual(productIds[0]);
        expect(res[0].order_line_ids[0].product_instance_id.equals(productInstanceIds[0])).toBe(true);
        expect(res[0].order_line_ids[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res[0].order_line_ids[1].product_instance_id).toEqual(productInstanceIds[0]);

        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});
