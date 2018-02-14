const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Collection/Products', () => {


  let productTypeIds = [];
  let brandIds = [];
  let colorIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      let ProductTypeArr = [{name: 'Shoes'}, {name: 'T-shirt'}];
      let BrandArr = [{name: 'Nike'}, {name: 'Puma'}];
      let ColorArr = [{name: 'Blue', color_id: 111111}, {name: 'Red', color_id: 222222}];

      Promise.all([
        // insert Product Types
        models['ProductTypeTest'].insertMany(ProductTypeArr).then(res => {
          productTypeIds[0] = res[0]._id;
          productTypeIds[1] = res[1]._id;
        }),
        // insert Brand
        models['BrandTest'].insertMany(BrandArr).then(res => {
          brandIds[0] = res[0]._id;
          brandIds[1] = res[1]._id;
        }),
        // insert Color
        models['ColorTest'].insertMany(ColorArr).then(res => {
          colorIds[0] = res[0]._id;
          colorIds[1] = res[1]._id;
        }),
      ]).then(() => {
        let productsArr = [{
          name: 'product 001',
          product_type: productTypeIds[0],
          brand: brandIds[0],
          base_price: 1000,
          desc: 'this is description about product 001',
          colors: [{color_id: colorIds[0], images: 'image001'}]
        }, {
          name: 'product 002',
          product_type: productTypeIds[1],
          brand: brandIds[1],
          base_price: 2000,
          desc: 'this is description about product 002',
          colors: [{color_id: colorIds[1], images: 'image002'}]
        }];
        models['ProductTest'].insertMany(productsArr).then(res => {
          console.log("####", res);
          done();
        });
      });
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