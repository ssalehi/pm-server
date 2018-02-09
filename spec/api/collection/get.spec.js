const rp = require('request-promise');
const lib = require('../../../lib/index');
const models = require('../../../mongo/models.mongo');
const mongoose = require('mongoose');

describe('GET Collection', () => {
  let imageUrls = [mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId(), mongoose.Types.ObjectId()];
  let parentId = mongoose.Types.ObjectId();
  let collectionIds = [];

  beforeEach(done => {
    lib.dbHelpers.dropAll().then(res => {
      // , {
      //   name: 'product 002',
      //     product_type: mongoose.Types.ObjectId(),
      //     brand: mongoose.Types.ObjectId(),
      //     base_price: 2000,
      //     desc: 'this is description 002',
      //     tags: [mongoose.Types.ObjectId()],
      //     reviews: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()],
      //     colors: [mongoose.Types.ObjectId()],
      //     instances: [mongoose.Types.ObjectId()]
      // }, {
      //   name: 'product 003',
      //     product_type: mongoose.Types.ObjectId(),
      //     brand: mongoose.Types.ObjectId(),
      //     base_price: 3000,
      //     desc: 'this is description 003',
      //     tags: [mongoose.Types.ObjectId()],
      //     reviews: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()],
      //     colors: [mongoose.Types.ObjectId()],
      //     instances: [mongoose.Types.ObjectId()]
      // }
      models['BrandTest'].create({name: 'nike'}).then(res => {
        let brandId = res._id;
        models['ProductTest'].insertMany([
          {
            name: 'product 001',
            product_type: mongoose.Types.ObjectId(),
            brand: brandId,
            base_price: 1000,
            desc: 'this is description 001',
            tags: [mongoose.Types.ObjectId()],
            reviews: [{
              customer_id: mongoose.Types.ObjectId(),
              brand: mongoose.Types.ObjectId()
            }],
            colors: [{
              color_id: mongoose.Types.ObjectId()
            }],
            instances: [{
              product_color_id: mongoose.Types.ObjectId(),
              size: 12,
              inventory: [{warehouse_id: mongoose.Types.ObjectId(), count: 10}]

            }]
          }, {
            name: 'product 002',
            product_type: mongoose.Types.ObjectId(),
            brand: mongoose.Types.ObjectId(),
            base_price: 2000,
            desc: 'this is description 002',
            tags: [mongoose.Types.ObjectId()],
            reviews: [{
              customer_id: mongoose.Types.ObjectId(),
              brand: mongoose.Types.ObjectId()
            }],
            colors: [{
              color_id: mongoose.Types.ObjectId()
            }],
            instances: [{
              product_color_id: mongoose.Types.ObjectId(),
              size: 22,
              inventory: [{warehouse_id: mongoose.Types.ObjectId(), count: 20}]
            }]
          }, {
            name: 'product 003',
            product_type: mongoose.Types.ObjectId(),
            brand: mongoose.Types.ObjectId(),
            base_price: 3000,
            desc: 'this is description 003',
            tags: [mongoose.Types.ObjectId()],
            reviews: [{
              customer_id: mongoose.Types.ObjectId(),
              brand: mongoose.Types.ObjectId()
            }],
            colors: [{
              color_id: mongoose.Types.ObjectId()
            }],
            instances: [{
              product_color_id: mongoose.Types.ObjectId(),
              size: 32,
              inventory: [{warehouse_id: mongoose.Types.ObjectId(), count: 30}]

            }]
          }
        ]).then(res => {
          // console.log("@@@@@ ___ RES[0]", res[0]);

          models['CollectionTest'].insertMany([{
            name: 'collection test 1',
            image_url: imageUrls[0],
            productIds: [res[0], res[1], res[2]],
            parentId: mongoose.Types.ObjectId()
          }, {
            name: 'collection test 2',
            image_url: imageUrls[1],
            productIds: [/*mongoose.Types.ObjectId()*/]
          }, {
            name: 'collection test 3',
            image_url: imageUrls[2],
            productIds: [mongoose.Types.ObjectId()]
          }, {
            name: 'collection test 4',
            image_url: imageUrls[3],
            productIds: [mongoose.Types.ObjectId(), mongoose.Types.ObjectId()],
            parent_id: parentId
          }]).then(res => {
            collectionIds[3] = res[3]._id;
            // console.log("@@@@@@@@@@@____1", res[0]);
            done();
          });
          done();
        }).catch(err => {
          console.log(err);
          done();
        });
      });


    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('should get all collection', function (done) {
    this.done = done;
    rp({
      method: 'get',
      uri: lib.helpers.apiTestURL(`collection`),
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      // expect(res.statusCode).toBe(200);
      // expect(res.body.length).toBe(4);
      // expect(res.body[0].productIds.length).toBe(0);
      // expect(res.body[1].productIds.length).toBe(0);
      // expect(res.body[2].image_url).toEqual(imageUrls[2].toString());
      // expect(res.body[3].parent_id).toEqual(parentId.toString());

      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  // it('should return one collection', function (done) {
  //   this.done = done;
  //   rp({
  //     method: 'get',
  //     uri: lib.helpers.apiTestURL(`collection/${collectionIds[3]}`),
  //     json: true,
  //     resolveWithFullResponse: true
  //   }).then(res => {
  //     expect(res.statusCode).toBe(200);
  //     expect(res.body.productIds.length).toBe(2);
  //     expect(res.body.image_url).toEqual(imageUrls[3].toString());
  //     expect(res.body.parent_id).toEqual(parentId.toString());
  //
  //     done();
  //   }).catch(lib.helpers.errorHandler.bind(this));
  // });
  //
  // it('expect error when cid is not valid', function (done) {
  //   this.done = done;
  //   rp({
  //     method: 'get',
  //     uri: lib.helpers.apiTestURL(`collection/1`),
  //     json: true,
  //     resolveWithFullResponse: true
  //   }).then(res => {
  //     this.fail('expect error when cid is not valid');
  //     done();
  //   }).catch(err => {
  //     expect(err.statusCode).toBe(500);
  //     expect(err.error).toEqual('Cast to ObjectId failed for value "1" at path "_id" for model "Collection"');
  //     // expect(err.error).toContain('Cast to ObjectId failed for value');
  //
  //     done();
  //   });
  // });


});