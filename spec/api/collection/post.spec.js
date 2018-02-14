const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Collection/Products', () => {


  let productTypeIds = [];
  let BrandIds = [];
  let BrandArr = [];
  let ProductTypeArr;

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      ProductTypeArr = [{
        name: 'Shoes'
      }, {
        name: 'T-shirt'
      }];
      models['ProductTypeTest'].insertMany(ProductTypeArr).then(res => {
        productTypes[0] = res[0]._id;
        productTypes[1] = res[1]._id;
      });
      // insert Product Types
      models['BrandTest'].insertMany(BrandArr).then(res => {
        productTypes[0] = res[0]._id;
        productTypes[1] = res[1]._id;
      });
      // insert Brand


      let productsArr = [{
        name: 'product 001',
        product_type
      }];
      models['ProductTest'].insertMany(productsArr).then(res => {


        done();
      }).catch(err => {
        console.log(err);
        done();
      });
      done();
      // end of insert products
    }).catch(err => {
      console.log(err);
      done();
    });
  });

  it('should return list of products when search by name', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL('products/search')
    }).then(res => {


      done();
    }).catch(lib.helpers.errorHandler.bind(this));

  });


});