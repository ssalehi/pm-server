const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const moment = require('moment');
const mongoose = require('mongoose');


describe('Get Wish-List', () => {
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
  let productColorId = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
  ]

  let type1, brand1;
  let colorArr = [];
  let productArr = [];

  let wishListArr = [
    {
      _id: mongoose.Types.ObjectId(),
      product_id: productIds[0],
      product_instance_id: productInstanceIds[0],
    }, {
      _id: mongoose.Types.ObjectId(),
      product_id: productIds[1],
      product_instance_id: productInstanceIds[2],
    }
  ];

  beforeEach(done => {
    productArr = [];
    colorArr = [];
    lib.dbHelpers.dropAll()
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {first_name: 'Sareh', surname: 'Salehi', wish_list: wishListArr})
      }).then(res => {
      let rpJar = null;
      customerObj.cid = res.cid;
      customerObj.jar = res.rpJar;
      return lib.dbHelpers.addAndLoginCustomer('a@a.com', '654321', {
        first_name: 'Ali',
        surname: 'Alavi',
        // wish_list: wishListArr[1]
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
      .then((res) => {
        colorArr.push(models['ColorTest']({
          name: 'testColor1'
        }));
        colorArr.push(models['ColorTest']({
          name: 'testColor2'
        }));
        return Promise.all([colorArr[0].save(), colorArr[1].save()]);
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
          colors: [
            {
              _id: productColorId[0],
              color_id: colorArr[0]._id,
              name: colorArr[0].name,
            },
            {
              _id: productColorId[1],
              color_id: colorArr[1]._id,
              name: colorArr[1].name,
            }
          ],
          desc: 'this is a test description for testProductName1',
          instances: [
            {
              _id: productInstanceIds[0],
              product_color_id: productColorId[0],
              size: "10.5",
              price: 35000,
              barcode: '123123123123'
            },
            {
              _id: productInstanceIds[1],
              product_color_id: productColorId[0],
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
          colors: [
            {
              _id: productColorId[1],
              color_id: colorArr[1]._id,
              name: colorArr[1].name,
            },
          ],
          desc: 'this is a test description for testProductName1',
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: productColorId[1],
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
  }); // now I have 2 customers, 2 products

  it('should not be able to get wish list if customer is not logged in', function (done) {
    this.done = done;
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL('wishlist'),
      jar: null,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        this.fail('Customer is not logged in');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.noUser.status);
        expect(err.error).toBe(error.noUser.message);
        done();
      });
  });
  it('should get all wished items of customer', function (done) {
    this.done = done;
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL('wishlist'),
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].product[0].instances[0].size).toBe(productArr[0].instances[0].size);
        expect(res.body[0].product[0].name).toEqual(productArr[0].name);
        expect(res.body[1].product[0].name).toEqual(productArr[1].name);
        expect(res.body[1].product[0].instances[0].size).toEqual('M');
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should resolve true message if wish list is empty', function (done) {
    this.done = done;
    rp({
      method: 'GET',
      uri: lib.helpers.apiTestURL('wishlist'),
      jar: customerObj2.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual('No wished item exists')
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
})