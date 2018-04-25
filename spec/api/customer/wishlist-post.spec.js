const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');
const mongoose = require('mongoose');


describe('Set Wish-List', () => {
  // I need some instance of customer and product for my test

  let customerObj = {
    cid: null,
    jar: null
  };
  let customerObj2 = {
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

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {first_name: 'Sareh', surname: 'Salehi'})
      }).then(res => {
      let rpJar = null;
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      return lib.dbHelpers.addAndLoginCustomer('a@a.com', '654321', {
        first_name: 'Ali',
        surname: 'Alavi'
      })
    })
      .then(res => {
        customerObj2.cid = res.cid;
        customerObj2.jar = res.rpJar;
        type1 = models['ProductTypeTest']({
          name: 'testType'
        });
        brand1 = models['BrandTest']({
          name: 'testBrand'
        });
        return Promise.all([type1.save(), brand1.save()]);
      })
      .then(res => {
        productArr.push(models['ProductTest']({
          _id: productIds[0],
          name: 'testProductName1',
          product_Type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id
          },
          base_price: 38000,
          desc: 'this is a test description for testProductName1',
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: mongoose.Types.ObjectId(),
              size: "10.5",
              price: 35000,
              barcode: '123123123123'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: mongoose.Types.ObjectId(),
              size: "11.5",
              barcode: '123123123124'
            }
          ]
        }));
        productArr.push(models['ProductTest']({
          _id: productIds[1],
          name: 'testProductName2',
          product_Type: {
            name: type1.name,
            product_type_id: type1._id
          },
          brand: {
            name: brand1.name,
            brand_id: brand1._id
          },
          base_price: 48000,
          desc: 'this is a test description for testProductName1',
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: mongoose.Types.ObjectId(),
              size: "M",
              price: 45000,
              barcode: '123123123125'
            }
          ]
        }));
        return Promise.all([productArr[0].save(), productArr[1].save()]);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err.statusCode);
        done();
      });
  }); // now I have 2 customers, 2 products, and one existing order for a customer

  it('should add a product to valid customer wish-list(wishlist is empty)', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then( res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(mongoose.Types.ObjectId(res.wish_list[0].product_id)).toEqual(mongoose.Types.ObjectId(productIds[0]));
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should not be able to add a product to customer wishlist that has been added before', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[1],
      },
      jar: customerObj2.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj2.cid)}).lean()
      })
      .then( res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[1]);
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
          },
          jar: customerObj2.jar,
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        this.fail('This product has been added to your wish-list before');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.duplicateWishListItem.statusCode);
        expect(err.error).toBe(error.duplicateWishListItem.message);
        done();
      });
  });

  it('should add a product to customer wishlist and another one after it', function (done) {
    this.done = done;

    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[1],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then( res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[1]);
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[0],
          },
          jar: customerObj.jar,
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(2);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[1].product_instance_id).toEqual(productInstanceIds[0]);
        done();
      })
      .catch(err => {
        console.log(err.message);
        done();
      });
  })

});