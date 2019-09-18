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
    mongoose.Types.ObjectId()
  ]

  let type1, brand1;
  let colorArr = [];
  let productArr = [];
  let wishRes = [];
  let productRes = {};

  beforeEach(done => {
    productArr = [];
    colorArr = [];
    lib.dbHelpers.dropAll()
      .then(res => {
        return lib.dbHelpers.addAndLoginCustomer('s@s.com', '123456', {first_name: 'Sareh', surname: 'Salehi'})
      }).then(res => {
        customerObj.cid = res.cid;
        customerObj.jar = res.rpJar;
        type1 = models()['ProductTypeTest']({
          name: 'testType'
        });
        brand1 = models()['BrandTest']({
          name: 'testBrand'
        });
        return Promise.all([type1.save(), brand1.save()]);
      })
      .then((res) => {
        colorArr.push(models()['ColorTest']({
          name: 'testColor1'
        }));
        colorArr.push(models()['ColorTest']({
          name: 'testColor2'
        }));
        colorArr.push(models()['ColorTest']({
          name: 'testColor3'
        }));
        return Promise.all([colorArr[0].save(), colorArr[1].save(), colorArr[2].save()]);
      })
      .then(res => {
        productArr.push(models()['ProductTest']({
          _id: productIds[0],
          name: 'testProductName1',
          article_no : "NK628683",
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
              product_color_id: productColorId[1],
              size: "11.5",
              barcode: '123123123124'
            }
          ]
        }));
        productArr.push(models()['ProductTest']({
          _id: productIds[1],
          name: 'testProductName2',
          article_no : "NK628684",
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
              _id: productColorId[2],
              color_id: colorArr[2]._id,
              name: colorArr[2].name,
            },
          ],
          desc: 'this is a test description for testProductName1',
          instances: [
            {
              _id: productInstanceIds[2],
              product_color_id: productColorId[2],
              size: "M",
              price: 45000,
              barcode: '123123123125'
            },
            {
              _id: productInstanceIds[3],
              product_color_id: productColorId[2],
              size: "L",
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
  }); // now I have 1 customers, 2 products

  it('should add a product to valid customer wish-list(wishlist is empty)', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        product_color_id: productColorId[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(mongoose.Types.ObjectId(res.wish_list[0].product_id)).toEqual(mongoose.Types.ObjectId(productIds[0]));
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get error when product_color_id is not passed', function (done) {
    rp({
      method: 'post',
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
      },
      uri: lib.helpers.apiTestURL('wishlist'),
      json: true,
      jar: customerObj.jar,
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Customer can not add product to his wishlist without specifing product_color_id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidId.status);
        expect(err.error).toBe(error.invalidId.message);
        done();
      });
  });

  it('should not be able to add a product to customer wishlist that has been added before', function (done) {
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[1],
        product_color_id: productColorId[1],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[1]);
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            product_color_id: productColorId[1],
          },
          jar: customerObj.jar,
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
        product_instance_id: productInstanceIds[0],
        product_color_id: productColorId[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[0]);
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[1],
            product_instance_id: productInstanceIds[2],
            product_color_id: productColorId[2],
          },
          jar: customerObj.jar,
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(2);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[1].product_instance_id).toEqual(productInstanceIds[2]);
        done();
      })
      .catch(err => {
        console.log(err.message);
        done();
      });
  });

  it('should override new product instance size if this product has been added before with another size(color is same)', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[1],
        product_instance_id: productInstanceIds[2],
        product_color_id: productColorId[2],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[1]);
        wishRes = res.wish_list;
        return models()['ProductTest'].findOne({_id: mongoose.Types.ObjectId(res.wish_list[0].product_id)}).lean()
      })
      .then(res => {
        productRes = res;
        expect(productRes.name).toContain(productArr[1].name);
        expect(productRes.instances.filter(el => el._id.toString() === wishRes[0].product_instance_id.toString())[0].size).toEqual("M");
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[1],
            product_instance_id: productInstanceIds[3],
            product_color_id: productColorId[2],
          },
          jar: customerObj.jar,
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[1]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[3]);
        wishRes = res.wish_list;
        expect(productRes.name).toContain(productArr[1].name);
        expect(productRes.instances.filter(el => el._id.toString() === wishRes[0].product_instance_id.toString())[0].size).toEqual("L");
        done();
      })
      .catch(err => {
        console.log(err.message);
        done();
      });
  })

  it('should be able to add one product withe different colors', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_instance_id: productInstanceIds[0],
        product_color_id: productColorId[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res.wish_list[0].product_color_id).toEqual(productColorId[0]);
        return rp({
          method: 'POST',
          uri: lib.helpers.apiTestURL('wishlist'),
          body: {
            product_id: productIds[0],
            product_instance_id: productInstanceIds[1],
            product_color_id: productColorId[1],
          },
          jar: customerObj.jar,
          json: true,
          resolveWithFullResponse: true
        })
      })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(2);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toEqual(productInstanceIds[0]);
        expect(res.wish_list[1].product_id).toEqual(productIds[0]);
        expect(res.wish_list[1].product_instance_id).toEqual(productInstanceIds[1]);
        done();
      })
      .catch(err => {
        console.log(err.message);
        done();
      });
  })

  it('should add product to wish list without specified product_instance_id', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('wishlist'),
      body: {
        product_id: productIds[0],
        product_color_id: productColorId[0],
      },
      jar: customerObj.jar,
      json: true,
      resolveWithFullResponse: true
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        return models()['CustomerTest'].findOne({_id: mongoose.Types.ObjectId(customerObj.cid)}).lean()
      })
      .then(res => {
        expect(res.wish_list.length).toBe(1);
        expect(res.wish_list[0].product_id).toEqual(productIds[0]);
        expect(res.wish_list[0].product_instance_id).toBeNull();
        expect(mongoose.Types.ObjectId(res.wish_list[0].product_id)).toEqual(mongoose.Types.ObjectId(productIds[0]));
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });
});