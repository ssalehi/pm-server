const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');
const _ = require('lodash');
let forEach = require('async-foreach').forEach;

xdescribe('POST Search Collection', () => {

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'collection 001',
        is_smart: false,
      }, {
        name: 'collection 0012',
        is_smart: false,
      }, {
        name: 'collection 003',
        is_smart: true,
      }, {
        name: 'collection 004',
        is_smart: true,
      }, {
        name: 'collection 005',
        is_smart: true,
      }, {
        name: 'collection 006',
        is_smart: true,
      }];
      models['CollectionTest'].insertMany(collectionArr).then(res => {
        done();
      });
    }).catch(err => {
      console.log(err);
      done();
    });
  });


  it('expect return all collections when phrase is empty', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toEqual(6);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('expect return all collections which contains the phrase name', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/Collection`),
      body: {
        options: {
          phrase: '001'
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toEqual(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get only manual collections', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Collection`),
      body: {
        options: {
          phrase: "",
          is_smart: false
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toBe(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should get only smart collections', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Collection`),
      body: {
        options: {
          phrase: "",
          is_smart: true
        },
        offset: 0,
        limit: 10,
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toBe(4);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});

xdescribe('POST Search Page', () => {

  let page1, page2, collection1, collection2;

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let inserts = [];
      let n = 0;
      while (n < 5) {
        let newPage = models['PageTest']({
          address: `testAddress${n + 1}`,
          is_app: false,
        });
        inserts.push(newPage.save());
        n++;
      }

      collection1 = models['CollectionTest']({
        name: 'collection1'
      });
      collection2 = models['CollectionTest']({
        name: 'collection2'
      });

      page1 = models['PageTest']({
        address: 'testAddress6',
        is_app: false,
        page_info: {
          collection_id: collection1._id
        }
      });
      page2 = models['PageTest']({
        address: 'testAddress7',
        is_app: true,
        page_info: {
          collection_id: collection2._id,
          content: 'some html content'
        }
      });

      inserts.push([collection1.save(), collection2.save(), page1.save(), page2.save()]);
      return Promise.all(inserts);
    })
      .then(res => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });


  it("should get first 5 pages order by their address", function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 0,
        limit: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.total).toBe(7);
      res = res.body.data;
      let n = 0;
      while (n < 5) {
        expect(res[n].address).toBe(`testAddress${n + 1}`);
        expect(res[n].is_app).toBe(false);
        n++;
      }
      done();
    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

  it("should get 2 pages after offset of 5", function (done) {
    this.done = done;
    rp({
      method: 'post',
      uri: lib.helpers.apiTestURL(`search/Page`),
      body: {
        options: {
          phrase: ''
        },
        offset: 5,
        limit: 5
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {

      expect(res.statusCode).toBe(200);
      res = res.body.data;
      expect(res.length).toBe(2);
      expect(res[0].address).toBe(`testAddress6`);
      expect(res[1].address).toBe(`testAddress7`);
      expect(res[0].collection.name).toBe(`collection1`);
      expect(res[1].collection.name).toBe(`collection2`);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

xdescribe('POST Suggest Product / Tag / Color', () => {

  let productTypeIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()];
  let brandIds = [
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId(),
    mongoose.Types.ObjectId()];
  let productIds = [];
  let tagIds = [];
  let colorIds = [];
  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let products = [{
        name: 'shoe2',
        product_type: productTypeIds[0],
        brand: brandIds[0],
        base_price: 1000
      }, {
        name: 'shoe3',
        product_type: productTypeIds[1],
        brand: brandIds[1],
        base_price: 2000
      }, {
        name: 'shoe1',
        product_type: productTypeIds[2],
        brand: brandIds[2],
        base_price: 3000
      }, {
        name: 'sneak',
        product_type: productTypeIds[3],
        brand: brandIds[3],
        base_price: 4000
      }];
      let tags = [
        {name: 'tag002'},
        {name: 'tag001'},
        {name: 'tag003'},
        {name: 'toog'},
      ];
      let colors = [
        {name: 'col1', color_id: '1'},
        {name: 'col2', color_id: '2'},
        {name: 'roloc3', color_id: '3'}
      ];
      models['ProductTest'].insertMany(products).then(res => {
        productIds[0] = res[0]._id;
        productIds[1] = res[1]._id;
        productIds[2] = res[2]._id;
        productIds[3] = res[3]._id;

        models['TagTest'].insertMany(tags).then(res => {
          tagIds[0] = res[0]._id;
          tagIds[1] = res[1]._id;
          tagIds[2] = res[2]._id;
          tagIds[3] = res[3]._id;

          models['ColorTest'].insertMany(colors).then(res => {
            colorIds[0] = res[0]._id;
            colorIds[1] = res[1]._id;
            colorIds[2] = res[2]._id;

            done();
          });
        });
      });
    });
  });

  it('should give suggestion over products', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Product`),
      body: {
        phrase: 'sho',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('shoe1');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should give suggestion over tags', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Tag`),
      body: {
        phrase: 'tag00',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('tag001');
      expect(res.body[1].name).toBe('tag002');
      expect(res.body[2].name).toBe('tag003');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should give suggestion over colors', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Color`),
      body: {
        phrase: 'col',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(2);
      expect(res.body[0].name).toBe('col1');
      expect(res.body[1]._id).toContain(colorIds[1]);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});

xdescribe('POST Suggest Collection', () => {

  let collectionIds = [];
  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collections = [
        {
          name: 'col1',
        }, {
          name: 'col11',
        },
        {
          name: 'col111',
        },
        {
          name: 'col2',
        }
      ];
      models['CollectionTest'].insertMany(collections).then(res => {
        collectionIds[0] = res[0]._id;
        collectionIds[1] = res[1]._id;
        collectionIds[2] = res[2]._id;
        collectionIds[3] = res[3]._id;
        done();
      });
    });
  });

  it('should give suggestion over collections', function (done) {
    this.done = done;
    rp({
      method: 'POST',
      uri: lib.helpers.apiTestURL(`/suggest/Collection`),
      body: {
        phrase: 'col1',
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toEqual(3);
      expect(res.body[0].name).toBe('col1');
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});

describe('POST Search Order', () => {

  let customers = [];
  let transactionIds = [];
  let addressIds = [];
  beforeEach((done) => {
    lib.dbHelpers
      .dropAll()
      .then(() => {
        // loop for create customer object, transactions, addresses
        for (let i = 0; i < 20; i++) {
          let addressId = mongoose.Types.ObjectId();
          let transactionId = mongoose.Types.ObjectId();
          let customer = {
            first_name: Math.random().toString(36).substring(7),
            surname: Math.random().toString(36).substring(7),
            username: Math.random().toString(36).substring(7) + '@yahoo.com',
            is_verified: _.sample([true, false])
          };
          customers.push(customer);
          transactionIds.push(addressId);
          addressIds.push(transactionId);
        }
        // loop async for create order with customerId
        forEach(customers, function (item, index, arr) {
          let done = this.async();
          models['CustomerTest'].create(item)
            .then((customer) => {
              let cId = customer._id;
              models['OrderTest'].create({
                customer_id: cId,
                transaction_id: Math.random() >= 0.5 ? null : transactionIds[index],
                address_id: Math.random() >= 0.5 ? null : addressIds[index],
                total_amount: Math.floor(Math.random() * Math.floor(20)),
                order_time: new Date(),
                is_cart: _.sample([false, true])
              });
              done();
              //end customer promise
            });
        }, function (notAborted, arr) {
          if (!notAborted) {
            console.log("done", notAborted, arr);
          }
        });
        // end foreach
      })
      .then(() => {
        done();
      })
      .catch(err => {
        console.log(err);
        done();
      });
  });

  it('should give order have transaction_id, address_id, is_card = false', function (done) {
    this.done = done;
    let oldResult;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`search/Order`),
      body: {
        options: {
          phrase: "",
        },
        offset: 0,
        limit: 10
      },
      json: true,
      resolveWithFullResponse: true
    }).then(res => {
      expect(res.statusCode).toBe(200);
      oldResult = res.body;
      return models['OrderTest'].find({$and: [{is_cart: false}, {transaction_id: {$ne: null}}, {address_id: {$ne: null}}]});
    }).then(res => {
      expect(oldResult.total).toBe(res.length);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});