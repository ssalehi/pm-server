const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const error = require('../../../lib/errors.list');
const mongoose = require('mongoose');

describe("Get products", () => {
  let typeIds, brandIds, colorIds, tgIds, tagIds, productColorIds, warehouseIds, productIds;
  beforeEach(done => {
    lib.dbHelpers.dropAll()
      .then(res => {
        return models['ProductTypeTest'].insertMany([
          {name: 'Shoes'},
          {name: 'Caps'},
        ])
      })
      .then(res => {
        typeIds = res.map(x => x._id);
        return models['BrandTest'].insertMany([
          {name: 'Nike'},
          {name: 'Puma'},
        ])
      })
      .then(res => {
        brandIds = res.map(x => x._id);
        return models['ColorTest'].insertMany([
          {name: 'green'},
          {name: 'red'},
        ])
      })
      .then(res => {
        colorIds = res.map(x => x._id);
        return models['TagGroupTest'].insertMany([
          {name: 'tg 1'},
          {name: 'tg 2'},
        ])
      })
      .then(res => {
        tgIds = res.map(x => x._id);
        return models['TagTest'].insertMany([
          {name: 'tag 1'},
          {name: 'tag 2'},
        ])
      })
      .then(res => {
        tagIds = res.map(x => x._id);

        productColorIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        warehouseIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        let product1 = {
          name: 'sample name 1',
          product_type: {name: 'Nike', product_type_id: typeIds[0]},
          brand: {name: 'Puma', brand_id: brandIds[1]},
          base_price: 30000,
          desc: 'some description for this product',
          colors: [
            {
              _id: productColorIds[0],
              color_id: colorIds[0],
              name: 'green',
              image: {
                thumbnail: 'one thumbnail',
                angels: ['some url 11', 'some url 12']
              }
            },
            {
              _id: productColorIds[1],
              color_id: colorIds[1],
              name: 'red',
              image: {
                thumbnail: 'another thumbnail',
                angels: ['some url 21', 'some url 22', 'some url 23']
              }
            }
          ],
          instances: [
            {
              product_color_id: productColorIds[0],
              size: '12',
              price: 123,
              barcode: '123456789',
              inventory: [{
                warehouse_id: warehouseIds[0],
                count: 2,
              }]
            },
            {
              product_color_id: productColorIds[0],
              size: '8',
              barcode: '123456780',
              inventory: [{
                warehouse_id: warehouseIds[0],
                count: 3,
              }]
            },
            {
              product_color_id: productColorIds[1],
              size: '15',
              barcode: '123456700',
              inventory: [{
                warehouse_id: warehouseIds[1],
                count: 0,
              }, {
                warehouse_id: warehouseIds[1],
                count: 1,
              }]
            },
            {
              product_color_id: productColorIds[1],
              size: '12',
              price: '123',
              barcode: '123456789',
              inventory: [{
                warehouse_id: warehouseIds[0],
                count: 2,
              }]
            }
          ],
          tags: [
            {name: 'tag 1', tg_name: 'tg 1', tag_id: tagIds[0]},
            {name: 'tag 2', tg_name: 'tg 2', tag_id: tagIds[1]}
          ]
        };
        let product2 = {
          name: 'sample name 2',
          product_type: {name: 'Nike', product_type_id: typeIds[0]},
          brand: {name: 'Puma', brand_id: brandIds[1]},
          base_price: 50000,
          desc: 'some description for this product',
        };

        return models['ProductTest'].insertMany([
          product1,
          product2
        ]);
      })
      .then(res => {
        productIds = res.map(x => x._id);
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
      uri: lib.helpers.apiTestURL(`product/${productIds[0]}`),
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);


      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });
  it("should get error when product id is not specified", function (done) {
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`product/color/null`),
      resolveWithFullResponse: true,
    })
      .then(res => {
        this.fail('Fetch product details without specifying product id');
        done();
      })
      .catch(err => {
        expect(err.statusCode).toBe(error.invalidId.status);
        expect(err.error).toBe(error.invalidId.message);
        done();
      });
  });
});




