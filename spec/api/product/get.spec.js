const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');

describe("Get products", () => {
  let product1, product2;
  let type1, type2, brand1, brand2, color1, color2;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

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
          color_id: 102
        });

        product1 = models['ProductTest']({
          name: 'sample name 1',
          product_type: type1._id,
          brand: brand1._id,
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              color_id: color1._id,
              images: ['some url 11', 'some url 12'],
            },
            {
              color_id: color2._id,
              images: ['some url 21', 'some url 22', 'some url 23'],
            }
          ],
          instances: [
            {
              product_color_id: color1._id,
              size: '12',
              price: 123,
              barcode: '123456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 2,
              }]
            },
            {
              product_color_id: color1._id,
              size: '8',
              barcode: '123456780',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 3,
              }]
            },
            {
              product_color_id: color1._id,
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
              product_color_id: color2._id,
              size: '12',
              price: '123',
              barcode: '123456789',
              inventory: [{
                warehouse_id: '5a9fe93d8c51152620491eff',
                count: 2,
              }]
            }
          ]
        });

        product2 = models['ProductTest']({
          name: 'sample name 2',
          product_type: type2._id,
          brand: brand2._id,
          base_price: 50000,
          desc: 'some description for this product',
        });

        return Promise.all([type1.save(), type2.save(), brand1.save(), brand2.save(), color1.save(), color2.save(), product1.save(), product2.save()]);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it("should get specific product by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/${product1._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(product1._id.toString());
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get details of specific color of product", function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/color/${product1._id}/${color1._id}`),
      resolveWithFullResponse: true,
    })
      .then(res => {
        expect(res.statusCode).toBe(200);
        res = JSON.parse(res.body);
        expect(res.length).toBe(1);
        res = res[0];
        expect(res.base_price).toBe(30000);
        expect(res.instances.length).toBe(3);
        expect(res.instances.map(i => i.price)).toContain(123);
        expect(res.instances.map(i => i.inventory)[2].map(i => i.count)).toContain(0);
        expect(res.instances.map(i => i.inventory)[2].map(i => i.count)).toContain(1);
        done();
      })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get error when product id is not specified", function (done) {
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/color/null/${color1._id}`),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Fetch product details without specifying product id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.productIdRequired.status);
        expect(err.error).toBe(error.productIdRequired.message);
        done();
      });
  });

  it("should get error when color id is not specified", function (done) {
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/color/${product1._id}/null`),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Fetch product details without specifying color id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.productColorIdRequired.status);
        expect(err.error).toBe(error.productColorIdRequired.message);
        done();
      });
  });
});


describe("Get product colors", () => {

  let product1;
  let type1, type2, brand1, brand2, color1, color2;

  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {

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
          color_id: 102
        });

        product1 = models['ProductTest']({
          name: 'sample name 1',
          product_type: type1._id,
          brand: brand1._id,
          base_price: 30000,
          desc: 'some description for this product',
          colors: [{
            color_id: color1._id,
            images: ['some url 1', 'some url 2']
          },
            {
              color_id: color2._id,
              images: ['some url 1', 'some url 2', 'some url 3']
            }]
        });

        return Promise.all([type1.save(), type2.save(), brand1.save(), brand2.save(), product1.save(), color1.save(), color2.save()]);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get colors of a product", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/color/${product1._id}`),
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);

      expect(result.colors.length).toBe(2);
      expect(result.colors[0].info.name).toBe('Green');
      expect(result.colors[1].info.name).toBe('Red');
      expect(result.colors[0].images.length).toBe(2);
      expect(result.colors[1].images.length).toBe(3);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

