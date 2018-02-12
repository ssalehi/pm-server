const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');

describe("Get products", () => {

  let product1, product2;
  let type1, type2, brand1, brand2;

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

        product1 = models['ProductTest']({
          name: 'sample name 1',
          product_type: type1._id,
          brand: brand1._id,
          base_price: 30000,
          desc: 'some description for this product',
        });

         product2 = models['ProductTest']({
          name: 'sample name 2',
          product_type: type2._id,
          brand: brand2._id,
          base_price: 50000,
          desc: 'some description for this product',
        });

        return Promise.all([type1.save(), type2.save(), brand1.save(), brand2.save(), product1.save(), product2.save()]);
      })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get all products", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product`),
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      let result = JSON.parse(res.body);
      expect(result.length).toBe(2);
      expect(result[0].name).toBe(product1.name);
      expect(result[0].product_type.name).toBe(type1.name);
      expect(result[0].brand.name).toBe(brand1.name);
      expect(result[1].name).toBe(product2.name);
      expect(result[1].product_type.name).toBe(type2.name);
      expect(result[1].brand.name).toBe(brand2.name);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get specific product by its id", function (done) {

    this.done = done;

    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/${product1._id}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      console.log('-> ',res.body);
      let result = JSON.parse(res.body);
      expect(result[0]._id).toBe(product1._id.toString());
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});


