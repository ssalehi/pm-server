const models = require('../../../mongo/models.mongo');
const lib = require('../../../lib');
const rp = require('request-promise');
const mongoose = require('mongoose');

describe('POST Search Collection', () => {

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let collectionArr = [{
        name: 'collection 001',
      }, {
        name: 'collection 0012',
      }, {
        name: 'collection 003',
      }, {
        name: 'collection 004',
      }, {
        name: 'collection 005',
      }, {
        name: 'collection 006',
      }];
      models['CollectionTest'].insertMany(collectionArr);
      done();
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
      expect(res.body.length).toEqual(6);
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
      expect(res.body.length).toEqual(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

});

describe('POST Search Page', () => {

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
        done()
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
      expect(res.body.length).toBe(5);
      let n = 0;
      while (n < 5) {
        expect(res.body[n].address).toBe(`testAddress${n + 1}`);
        expect(res.body[n].is_app).toBe(false);
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
      expect(res.body.length).toBe(2);
      expect(res.body[0].address).toBe(`testAddress6`);
      expect(res.body[1].address).toBe(`testAddress7`);
      expect(res.body[0].collection.name).toBe(`collection1`);
      expect(res.body[1].collection.name).toBe(`collection2`);
      done();

    })
      .catch(lib.helpers.errorHandler.bind(this));
  });

});

describe('POST Search ProductTypes / TagGroups', () => {

  beforeEach((done) => {
    lib.dbHelpers.dropAll().then(res => {
      let productTypeArr = [{
        name: 'Shoes'
      }, {
        name: 'Socks'
      }, {
        name: 'Pants'
      }];
      let tagGroupsArr = [{
        name: 'taggroup1'
      }, {
        name: 'taggroup2'
      }];
      models['ProductTypeTest'].insertMany(productTypeArr).then(res => {
        models['TagGroupTest'].insertMany(tagGroupsArr).then(res => {
          done();
        })
      });
    });
  });

  it('should return all product_types when phrase is empty', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/ProductType`),
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
      expect(res.body.length).toEqual(3);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });

  it('should return all tag_groups when phrase is empty', function (done) {
    this.done = done;
    rp({
      method: "POST",
      uri: lib.helpers.apiTestURL(`/search/TagGroup`),
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
      expect(res.body.length).toEqual(2);
      done();
    }).catch(lib.helpers.errorHandler.bind(this));
  });
});

describe('POST Suggest Product / Tag', () => {

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

          done();
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

});

describe('POST Suggest Collection', () => {

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
      })
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